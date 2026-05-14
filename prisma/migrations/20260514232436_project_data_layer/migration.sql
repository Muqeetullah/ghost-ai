-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Spec" DROP CONSTRAINT "Spec_projectId_fkey";

-- DropIndex
DROP INDEX "Project_slug_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "slug",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "Spec";

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectCollaborator_email_idx" ON "ProjectCollaborator"("email");

-- CreateIndex
CREATE INDEX "ProjectCollaborator_projectId_createdAt_idx" ON "ProjectCollaborator"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCollaborator_projectId_email_key" ON "ProjectCollaborator"("projectId", "email");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
