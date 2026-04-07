-- CreateTable
CREATE TABLE "InternAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "clockInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOutAt" DATETIME,
    "durationMinutes" INTEGER,
    "notes" TEXT,
    CONSTRAINT "InternAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InternAttendance_userId_clockInAt_idx" ON "InternAttendance"("userId", "clockInAt");

-- CreateIndex
CREATE INDEX "InternAttendance_clockOutAt_idx" ON "InternAttendance"("clockOutAt");
