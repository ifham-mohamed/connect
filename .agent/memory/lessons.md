# Reviewed lessons

- Separate development verification from operational scripts: several npm commands load environment files and can perform real work. Evidence: package.json.
- Preserve transaction ownership during extraction. Evidence: matching-repository and monitor operation regression tests.
- Refresh indices only after reviewing the diff. A fresh hash proves correspondence, not correctness.
