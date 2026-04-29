<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-deploy-rules -->
# Vercel deploy convention

When the user says "push to Vercel" for this project, deploy to production and treat the canonical user-facing URL as:

https://bonaalessandro.ink/host/login

After every production deploy, make sure `bonaalessandro.ink` is aliased to the new deployment, not only the generated `vercel.app` URL.
<!-- END:project-deploy-rules -->
