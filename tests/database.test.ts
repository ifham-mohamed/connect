import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { PoolClient } from "pg";
const database = new PGlite();
vi.mock("../src/lib/db", () => ({
  db: () => ({
    query: async (text: string, params: unknown[]) =>
      database.query(text, params),
  }),
}));
const {
  rebuildMatches,
  rebuildMatchesForJobs,
  rebuildMatchesForMonitor,
  rebuildMatchesForUser,
} = await import("../src/lib/matching-repository");
const { getDashboard, getJobDetail, jobSelect, sourceSelect } =
  await import("../src/lib/repository");
const { decodeCursor, listJobs, workspaceSummary } =
  await import("../src/lib/focused-repository");
const client = {
  query: (text: string, params?: unknown[]) => database.query(text, params),
} as unknown as PoolClient;
beforeAll(async () => {
  await database.exec(
    await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/007_user_auth.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(
      new URL("../db/008_personal_onboarding.sql", import.meta.url),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/009_personal_job_states.sql", import.meta.url),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/010_run_job_results.sql", import.meta.url),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/011_run_result_backfill.sql", import.meta.url),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/012_incremental_matching.sql", import.meta.url),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/013_experience_matching.sql", import.meta.url),
      "utf8",
    ),
  );
  const legacy = await database.query<{ id: string }>(
    `INSERT INTO users(name,email,password_hash,preferences)
     VALUES('Legacy Entry','legacy-entry@example.com','hash','{"experience":"entry"}'::jsonb)
     RETURNING id`,
  );
  const legacyJob = await database.query<{ id: string }>(
    `INSERT INTO jobs(source_id,external_id,title,company,location,url)
     SELECT id,'legacy-devjobs','Junior Software Engineer','Legacy Co','Colombo','https://devjobs.lk/legacy'
     FROM sources WHERE kind='devjobs' LIMIT 1 RETURNING id`,
  );
  const legacyRun = await database.query<{ id: string }>(
    `INSERT INTO sync_runs(source_id,status,finished_at)
     SELECT id,'success',now() FROM sources WHERE kind='devjobs' LIMIT 1 RETURNING id`,
  );
  await database.query(
    "INSERT INTO sync_run_jobs(run_id,job_id,is_new) VALUES($1,$2,true)",
    [legacyRun.rows[0].id, legacyJob.rows[0].id],
  );
  await database.query(
    "INSERT INTO job_user_states(user_id,job_id,status) VALUES($1,$2,'saved')",
    [legacy.rows[0].id, legacyJob.rows[0].id],
  );
  await database.exec(
    await readFile(
      new URL(
        "../db/014_career_stages_and_remove_devjobs.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL(
        "../db/015_distinct_early_career_and_location_coverage.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL(
        "../db/016_location_work_modes_and_numbered_levels.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await database.exec(
    await readFile(
      new URL("../db/017_worldwide_remote_matching.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const migration of [
    "018_job_intelligence",
    "019_assisted_matching",
    "020_requirement_evidence",
    "021_candidate_workspace",
    "022_assisted_corrections",
    "023_assisted_rule_lookup",
    "024_candidate_cv",
    "025_job_cv_reviews",
    "026_private_image_context",
    "027_itpro_category_sources",
    "028_security_audit",
    "029_ai_usage_limits",
    "030_request_rate_limits",
    "031_scaling_foundation",
    "032_cost_controls",
    "033_source_observability",
    "034_role_title_aliases",
    "035_unspecified_stage_compatibility",
    "036_user_jev_api_keys",
  ])
    await database.exec(
      await readFile(
        new URL(`../db/${migration}.sql`, import.meta.url),
        "utf8",
      ),
    );
});
afterAll(async () => {
  await database.close();
});
describe("PostgreSQL schema and matching integration", () => {
  it("normalizes source title punctuation and retains role-family aliases", async () => {
    const variants = await database.query<{
      fullStack: boolean;
      frontend: boolean;
      backend: boolean;
    }>(`SELECT
      jobradar_keyword_match('Full-stack Engineer - Java & React','full stack engineer') AS "fullStack",
      jobradar_keyword_match('Front-end Developer','frontend developer') AS frontend,
      jobradar_keyword_match('Back End Engineer','backend engineer') AS backend`);
    expect(variants.rows[0]).toEqual({
      fullStack: true,
      frontend: true,
      backend: true,
    });

    const softwareMonitor = await database.query<{ keywords: string[] }>(
      "SELECT keywords FROM monitors WHERE name='Software Engineer' LIMIT 1",
    );
    expect(softwareMonitor.rows[0].keywords).toContain("software developer");
    expect(softwareMonitor.rows[0].keywords).toContain(
      "software development engineer",
    );

    const stages = await database.query<{
      entry: boolean;
      internship: boolean;
      explicitConflict: boolean;
    }>(`SELECT
      jobradar_experience_match('Full-stack Engineer - Java & React','entry') AS entry,
      jobradar_experience_match('Full-stack Engineer - Java & React','internship') AS internship,
      jobradar_experience_match('Senior Full-stack Engineer','entry') AS "explicitConflict"`);
    expect(stages.rows[0]).toEqual({
      entry: true,
      internship: false,
      explicitConflict: false,
    });
  });

  it("keeps reviewed CVs per account and removes them with the account", async () => {
    const users = await database.query<{ id: string }>(
      `INSERT INTO users(name,email,password_hash) VALUES
       ('CV One','cv-one@example.com','hash'),('CV Two','cv-two@example.com','hash') RETURNING id`,
    );
    await database.query(
      `INSERT INTO candidate_cvs(user_id,profile) VALUES($1,$3::jsonb),($2,$4::jsonb)`,
      [
        users.rows[0].id,
        users.rows[1].id,
        JSON.stringify({ name: "One" }),
        JSON.stringify({ name: "Two" }),
      ],
    );
    const reviewJob = await database.query<{ id: string }>(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url)
       SELECT id,'cv-review-test','Example Engineer','Example Co','Colombo','https://example.com/cv-review-test'
       FROM sources LIMIT 1 RETURNING id`,
    );
    await database.query(
      `INSERT INTO job_cv_reviews(user_id,job_id,cv_revision,job_hash,result,model_identifier)
       VALUES($1,$3,1,$4,'{}'::jsonb,'test-jev'),($2,$3,1,$4,'{}'::jsonb,'test-jev')`,
      [
        users.rows[0].id,
        users.rows[1].id,
        reviewJob.rows[0].id,
        "a".repeat(64),
      ],
    );
    const first = await database.query<{ profile: { name: string } }>(
      "SELECT profile FROM candidate_cvs WHERE user_id=$1",
      [users.rows[0].id],
    );
    expect(first.rows).toEqual([{ profile: { name: "One" } }]);
    await database.query("DELETE FROM users WHERE id=$1", [users.rows[0].id]);
    expect(
      (
        await database.query("SELECT 1 FROM job_cv_reviews WHERE user_id=$1", [
          users.rows[0].id,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await database.query("SELECT 1 FROM job_cv_reviews WHERE user_id=$1", [
          users.rows[1].id,
        ])
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await database.query("SELECT 1 FROM candidate_cvs WHERE user_id=$1", [
          users.rows[0].id,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await database.query("SELECT 1 FROM candidate_cvs WHERE user_id=$1", [
          users.rows[1].id,
        ])
      ).rowCount,
    ).toBe(1);
    await database.query("DELETE FROM jobs WHERE id=$1", [
      reviewJob.rows[0].id,
    ]);
  });
  it("matches literal skill names consistently with the frontend", async () => {
    const result = await database.query<{
      ui: boolean;
      cpp: boolean;
      next: boolean;
    }>(
      `SELECT jobradar_keyword_match('Build software','UI') AS ui,jobradar_keyword_match('C++ engineer','C++') AS cpp,jobradar_keyword_match('Next.js developer','Next.js') AS next`,
    );
    expect(result.rows[0]).toEqual({ ui: false, cpp: true, next: true });
  });
  it("migrates and seeds Sri Lankan and remote sources", async () => {
    const sources = await database.query<{ name: string }>(sourceSelect);
    expect(sources.rows.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "ITPro.lk",
        "ITPro Software Engineering",
        "ITPro Web Development",
        "ITPro Mobile Development",
        "ITPro DevOps and Cloud",
        "ITPro AI and Data",
        "TopJobs Software Development",
        "JobEka IT Software & Design",
        "Remotive",
        "Dijital Team",
      ]),
    );
    expect(sources.rows.some((source) => source.name.includes("DevJobs"))).toBe(
      false,
    );
    expect(
      (
        await database.query<{ experience: string }>(
          "SELECT preferences->>'experience' AS experience FROM users WHERE email='legacy-entry@example.com'",
        )
      ).rows[0].experience,
    ).toBe("entry");
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM jobs WHERE external_id='legacy-devjobs'",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it("retains first-seen dates and saved state when a listing is imported again", async () => {
    const source = await database.query<{ id: string }>(
      "SELECT id FROM sources WHERE kind='itpro'",
    );
    const values = [
      source.rows[0].id,
      "test-1",
      "Software Engineer",
      "Acme",
      "Colombo, Sri Lanka",
      "https://itpro.lk/job/1/",
    ];
    await database.query(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url,status) VALUES($1,$2,$3,$4,$5,$6,'saved')`,
      values,
    );
    const first = await database.query<{ first_seen_at: Date }>(
      "SELECT first_seen_at FROM jobs",
    );
    await database.query(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_id,external_id) DO UPDATE SET title=excluded.title,last_seen_at=now()`,
      values,
    );
    const result = await database.query<{
      status: string;
      first_seen_at: Date;
    }>(`SELECT status,first_seen_at FROM jobs`);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe("saved");
    expect(result.rows[0].first_seen_at).toEqual(first.rows[0].first_seen_at);
  });
  it("matches numeric and Roman role levels consistently in PostgreSQL", async () => {
    const result = await database.query<{
      entry_numeric: boolean;
      entry_roman: boolean;
      mid: boolean;
      senior: boolean;
    }>(
      `SELECT jobradar_experience_match('Full Stack Developer (1)','entry') entry_numeric,
              jobradar_experience_match('Full Stack Developer I','entry') entry_roman,
              jobradar_experience_match('Full Stack Developer II','mid') mid,
              jobradar_experience_match('Full Stack Developer (3)','senior') senior`,
    );
    expect(result.rows[0]).toEqual({
      entry_numeric: true,
      entry_roman: true,
      mid: true,
      senior: true,
    });
  });
  it("matches seeded role monitors and refreshes matches after a pause", async () => {
    await rebuildMatches(client);
    const result = await database.query<{ matchedMonitors: string[] }>(
      jobSelect,
    );
    expect(result.rows[0].matchedMonitors).toHaveLength(1);
    await database.query("UPDATE monitors SET enabled=false");
    await rebuildMatches(client);
    const after = await database.query<{ matchedMonitors: string[] }>(
      jobSelect,
    );
    expect(after.rows[0].matchedMonitors).toHaveLength(0);
  });
  it("refreshes only the affected monitor, user, or jobs", async () => {
    const users = await database.query<{ id: string }>(
      `INSERT INTO users(name,email,password_hash)
       VALUES('Scoped One','scoped-one@example.com','hash'),('Scoped Two','scoped-two@example.com','hash') RETURNING id`,
    );
    const monitors = await database.query<{ id: string; user_id: string }>(
      `INSERT INTO monitors(user_id,name,keywords)
       VALUES($1,'Backend roles',ARRAY['Backend Engineer']),($2,'Design roles',ARRAY['Product Designer'])
       RETURNING id,user_id`,
      [users.rows[0].id, users.rows[1].id],
    );
    const source = await database.query<{ id: string }>(
      "SELECT id FROM sources LIMIT 1",
    );
    const jobs = await database.query<{ id: string }>(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url)
       VALUES($1,'scoped-backend','Junior Backend Engineer','Acme','Colombo','https://example.com/backend'),
             ($1,'scoped-design','Product Designer','Acme','Colombo','https://example.com/design'),
             ($1,'scoped-senior','Senior Backend Engineer','Acme','Colombo','https://example.com/senior'),
             ($1,'scoped-intern','Backend Engineer Internship','Acme','Colombo','https://example.com/intern')
       RETURNING id`,
      [source.rows[0].id],
    );

    await rebuildMatches(client);
    const designBefore = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1",
      [monitors.rows[1].id],
    );
    await database.query("UPDATE monitors SET enabled=false WHERE id=$1", [
      monitors.rows[0].id,
    ]);
    await rebuildMatchesForMonitor(client, monitors.rows[0].id);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1",
          [monitors.rows[0].id],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1",
          [monitors.rows[1].id],
        )
      ).rows[0].count,
    ).toBe(designBefore.rows[0].count);

    await database.query(
      "UPDATE jobs SET title='Accountant',tags=ARRAY[]::text[] WHERE id=$1",
      [jobs.rows[1].id],
    );
    await rebuildMatchesForJobs(client, [jobs.rows[1].id]);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1 AND job_id=$2",
          [monitors.rows[1].id, jobs.rows[1].id],
        )
      ).rows[0].count,
    ).toBe(0);

    await database.query("UPDATE monitors SET enabled=true WHERE id=$1", [
      monitors.rows[0].id,
    ]);
    await database.query("UPDATE users SET preferences=$2::jsonb WHERE id=$1", [
      users.rows[0].id,
      JSON.stringify({ experience: "entry" }),
    ]);
    await database.query(
      "UPDATE jobs SET description='Private full opportunity detail' WHERE id=$1",
      [jobs.rows[0].id],
    );
    await rebuildMatchesForUser(client, users.rows[0].id);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1 AND job_id=$2",
          [monitors.rows[0].id, jobs.rows[0].id],
        )
      ).rows[0].count,
    ).toBe(1);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1 AND job_id=$2",
          [monitors.rows[0].id, jobs.rows[2].id],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await database.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM monitor_matches WHERE monitor_id=$1 AND job_id=$2",
          [monitors.rows[0].id, jobs.rows[3].id],
        )
      ).rows[0].count,
    ).toBe(0);

    const scopedUser = {
      id: users.rows[0].id,
      name: "Scoped One",
      email: "scoped-one@example.com",
      role: "member" as const,
      onboardingCompleted: true,
      preferences: { experience: "entry" as const },
    };
    const dashboard = await getDashboard(scopedUser, client);
    expect(
      dashboard.jobs.find((job) => job.id === jobs.rows[0].id)?.description,
    ).toBe("");
    expect(
      (await getJobDetail(scopedUser, jobs.rows[0].id, client))?.description,
    ).toBe("Private full opportunity detail");
    expect(
      await getJobDetail(
        {
          ...scopedUser,
          id: users.rows[1].id,
          email: "scoped-two@example.com",
        },
        jobs.rows[0].id,
        client,
      ),
    ).toBeNull();
  });
  it("stores onboarding state and scopes monitors to their user", async () => {
    const user = await database.query<{ id: string }>(
      "INSERT INTO users(name,email,password_hash) VALUES('A User','a@example.com','hash') RETURNING id",
    );
    await database.query("UPDATE monitors SET user_id=$1", [user.rows[0].id]);
    await database.query(
      "UPDATE users SET onboarding_completed_at=now(),preferences=$2::jsonb WHERE id=$1",
      [user.rows[0].id, JSON.stringify({ roles: ["Software Engineer"] })],
    );
    const owned = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM monitors WHERE user_id=$1",
      [user.rows[0].id],
    );
    const profile = await database.query<{ completed: boolean }>(
      "SELECT onboarding_completed_at IS NOT NULL AS completed FROM users WHERE id=$1",
      [user.rows[0].id],
    );
    expect(owned.rows[0].count).toBeGreaterThan(0);
    expect(profile.rows[0].completed).toBe(true);
  });
  it("keeps saved, applied, archived, and reviewed state personal", async () => {
    const users = await database.query<{ id: string }>(
      `INSERT INTO users(name,email,password_hash)
       VALUES('First Person','first@example.com','hash'),('Second Person','second@example.com','hash') RETURNING id`,
    );
    const job = await database.query<{ id: string }>(
      "SELECT id FROM jobs LIMIT 1",
    );
    await database.query(
      `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at,extracted_description,extracted_description_confidence,extracted_at)
       VALUES($1,$3,'saved',now(),'Private OCR for first account',92,now()),
             ($2,$3,'archived',NULL,'Private OCR for second account',84,now())`,
      [users.rows[0].id, users.rows[1].id, job.rows[0].id],
    );
    const states = await database.query<{
      userId: string;
      status: string;
      reviewed: boolean;
    }>(
      `SELECT user_id AS "userId",status,reviewed_at IS NOT NULL AS reviewed
       FROM job_user_states WHERE job_id=$1 AND user_id=ANY($2::uuid[]) ORDER BY status`,
      [job.rows[0].id, users.rows.map((user) => user.id)],
    );
    expect(states.rows).toEqual([
      { userId: users.rows[1].id, status: "archived", reviewed: false },
      { userId: users.rows[0].id, status: "saved", reviewed: true },
    ]);
    const firstDetail = await getJobDetail(
      {
        id: users.rows[0].id,
        name: "First Person",
        email: "first@example.com",
        role: "member",
        onboardingCompleted: true,
        preferences: {},
      },
      job.rows[0].id,
      client,
    );
    const secondDetail = await getJobDetail(
      {
        id: users.rows[1].id,
        name: "Second Person",
        email: "second@example.com",
        role: "member",
        onboardingCompleted: true,
        preferences: {},
      },
      job.rows[0].id,
      client,
    );
    expect(firstDetail.description).toBe("Private OCR for first account");
    expect(secondDetail.description).toBe("Private OCR for second account");
  });
  it("keeps candidate profiles and application notes scoped to each account", async () => {
    const users = await database.query<{ id: string }>(
      `INSERT INTO users(name,email,password_hash)
       VALUES('Candidate One','candidate-one@example.com','hash'),('Candidate Two','candidate-two@example.com','hash') RETURNING id`,
    );
    const job = await database.query<{ id: string }>(
      "SELECT id FROM jobs LIMIT 1",
    );
    await database.query(
      `INSERT INTO candidate_profiles(user_id,skills,evidence_summary,consented_at)
       VALUES($1,ARRAY['React'],'Built a public portfolio',now()),($2,ARRAY['Go'],'Maintained an API',now())`,
      [users.rows[0].id, users.rows[1].id],
    );
    await database.query(
      `INSERT INTO job_user_states(user_id,job_id,status,application_note,applied_at)
       VALUES($1,$3,'applied','Applied on company site',now()),($2,$3,'saved','Ask for referral',NULL)`,
      [users.rows[0].id, users.rows[1].id, job.rows[0].id],
    );
    const first = await database.query<{
      skills: string[];
      note: string;
      applied: boolean;
    }>(
      `SELECT p.skills,s.application_note AS note,s.applied_at IS NOT NULL AS applied
       FROM candidate_profiles p JOIN job_user_states s ON s.user_id=p.user_id
       WHERE p.user_id=$1 AND s.job_id=$2`,
      [users.rows[0].id, job.rows[0].id],
    );
    expect(first.rows).toEqual([
      { skills: ["React"], note: "Applied on company site", applied: true },
    ]);
    await database.query("DELETE FROM candidate_profiles WHERE user_id=$1", [
      users.rows[0].id,
    ]);
    expect(
      (
        await database.query(
          "SELECT 1 FROM candidate_profiles WHERE user_id=$1",
          [users.rows[0].id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await database.query<{ application_note: string }>(
          "SELECT application_note FROM job_user_states WHERE user_id=$1 AND job_id=$2",
          [users.rows[0].id, job.rows[0].id],
        )
      ).rows[0].application_note,
    ).toBe("Applied on company site");
  });
  it("enforces unique source identity and valid application status", async () => {
    await expect(
      database.query(
        "INSERT INTO sources(name,kind) VALUES('Duplicate','itpro')",
      ),
    ).rejects.toThrow();
    await expect(
      database.query("UPDATE jobs SET status='unknown'"),
    ).rejects.toThrow();
  });
  it("paginates stable job summaries without leaking jobs to an unrelated member", async () => {
    const owner = await database.query<{
      id: string;
      name: string;
      email: string;
    }>(
      "SELECT id,name,email FROM users WHERE role='owner' ORDER BY created_at LIMIT 1",
    );
    const input = {
      limit: 2,
      cursor: null,
      search: "",
      status: "all",
      monitor: "all",
      source: "all",
      matched: false,
      location: "",
      mode: "all",
    };
    const first = await listJobs(
      client,
      {
        ...owner.rows[0],
        role: "owner",
        onboardingCompleted: true,
        preferences: {},
      },
      input,
    );
    expect(first.items.length).toBeLessThanOrEqual(2);
    expect(first.total).toBeGreaterThanOrEqual(first.items.length);
    if (first.nextCursor) {
      const second = await listJobs(
        client,
        {
          ...owner.rows[0],
          role: "owner",
          onboardingCompleted: true,
          preferences: {},
        },
        { ...input, cursor: decodeCursor(first.nextCursor) },
      );
      expect(second.items.map((job) => job.id)).not.toContain(
        first.items[0]?.id,
      );
      expect(
        new Set([...first.items, ...second.items].map((job) => job.id)).size,
      ).toBe(first.items.length + second.items.length);
      expect(second.total).toBe(first.total);
    }
    const member = await database.query<{
      id: string;
      name: string;
      email: string;
    }>(
      "INSERT INTO users(name,email,password_hash) VALUES('No Access','no-access@example.com','hash') RETURNING id,name,email",
    );
    const hidden = await listJobs(
      client,
      {
        ...member.rows[0],
        role: "member",
        onboardingCompleted: true,
        preferences: {},
      },
      input,
    );
    expect(hidden.items).toEqual([]);
    expect(hidden.total).toBe(0);
    const summary = await workspaceSummary(client, {
      ...owner.rows[0],
      role: "owner",
      onboardingCompleted: true,
      preferences: {},
    });
    expect(summary.counts.totalCollected).toBe(first.total);
    expect(summary.counts.relevant).toBeLessThanOrEqual(
      summary.counts.totalCollected,
    );
  });
});
