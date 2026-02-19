DO $$ BEGIN CREATE TYPE "FeedbackStatus" AS ENUM ('ouvert', 'en_cours', 'resolu', 'ferme'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FeedbackType" AS ENUM ('plainte', 'suggestion', 'bug', 'autre'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'plainte',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'ouvert',
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Feedback_tenantId_idx" ON "Feedback"("tenantId");
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
