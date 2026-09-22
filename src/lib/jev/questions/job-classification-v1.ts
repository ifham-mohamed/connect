import { choice, noul } from "@typesafe-ai/sdk";

export const JOB_CLASSIFICATION_VERSION = "job-classification-v1" as const;

export const jobClassificationQuestionsV1 = {
  isTechnologyRole: noul(
    "Is the primary purpose of this job to build, operate, secure, test, design, analyze, or support software or technology systems?",
    {
      true: "The main work is a technology role, including software, data, infrastructure, security, QA, technical product/design, or technical support.",
      false:
        "Technology may be mentioned, but the main work is non-technical, such as general sales, finance, HR, or operations.",
    },
  ),
  roleFamily: choice(
    "Which single role family best describes the primary job?",
    {
      software:
        "General software or application engineering without a clearer family.",
      frontend: "Browser, web UI, mobile UI, or client-side engineering.",
      backend: "Server-side applications, APIs, services, or databases.",
      full_stack: "Substantial frontend and backend application work.",
      data: "Data engineering, analytics engineering, data science, AI, or machine learning.",
      infrastructure:
        "Cloud, platform, DevOps, SRE, systems, or network engineering.",
      security:
        "Cybersecurity, application security, security operations, or governance.",
      qa: "Software testing, test automation, or quality assurance.",
      design: "Product design, UX, UI design, or user research.",
      product: "Technical product management or product ownership.",
      support:
        "Technical support, solutions, implementation, or customer engineering.",
      other: "None of the listed technology role families is the primary job.",
    },
  ),
  careerStage: choice(
    "Which career stage is explicitly or most strongly supported by the job title and description?",
    {
      internship:
        "Intern, internship, trainee, apprentice, placement, or comparable supervised learning role.",
      entry:
        "Junior, associate, graduate, entry-level, Level 1, Level I, or comparable early-career employee role.",
      mid: "Mid-level, intermediate, Level 2, Level II, or independent contributor role clearly beyond entry without senior leadership.",
      senior:
        "Senior, lead, principal, staff, manager, architect, head, director, Level 3/III or higher role.",
      unclear:
        "The text does not support one career stage strongly enough or contains unresolved conflicting stages.",
    },
  ),
  workArrangement: choice(
    "Which work arrangement does this specific listing state or require?",
    {
      onsite:
        "Work is at an employer or client location and is not described as hybrid or remote.",
      hybrid:
        "Work is explicitly split between remote and an employer or client location.",
      remote:
        "Work is explicitly remote, work-from-home, distributed, or worldwide remote.",
      unclear:
        "The listing does not state the arrangement clearly or contains unresolved conflict.",
    },
  ),
  contentQuality: choice(
    "Is the supplied content usable as a current job listing?",
    {
      usable:
        "It describes a specific role with enough job information to classify.",
      sparse:
        "It appears to be a job but contains too little information for reliable classification.",
      malformed:
        "The content is broken, navigation-like, corrupted, or not coherent job text.",
      non_job:
        "It is primarily an article, marketing page, member post without a concrete opening, or other non-job content.",
    },
  ),
} as const;

export type JobClassificationQuestionsV1 = typeof jobClassificationQuestionsV1;
