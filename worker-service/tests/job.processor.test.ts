import { describe, it, expect, vi, beforeEach } from "vitest";

// On remplace la base de données par un faux.
vi.mock("../src/config/prisma", () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../src/config/prisma";
import { processJob } from "../src/processors/job.processor";

const JOB_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.resetAllMocks();
  // Le processeur écrit dans la console : on la fait taire pendant les tests.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("processJob", () => {
  it("traite un job : PROCESSING puis COMPLETED avec le résultat", async () => {
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: JOB_ID,
      payload: { text: "Hello Cloud Native" },
    } as any);
    vi.mocked(prisma.job.update).mockResolvedValue({} as any);

    await processJob(JOB_ID);

    expect(prisma.job.update).toHaveBeenCalledTimes(2);
    expect(prisma.job.update).toHaveBeenNthCalledWith(1, {
      where: { id: JOB_ID },
      data: { status: "PROCESSING" },
    });
    expect(prisma.job.update).toHaveBeenNthCalledWith(2, {
      where: { id: JOB_ID },
      data: {
        status: "COMPLETED",
        result: {
          wordCount: 3,
          characterCount: 18,
          uppercase: "HELLO CLOUD NATIVE",
        },
      },
    });
  });

  it("échoue volontairement quand le texte est FAIL_TEST", async () => {
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: JOB_ID,
      payload: { text: "FAIL_TEST" },
    } as any);
    vi.mocked(prisma.job.update).mockResolvedValue({} as any);

    await expect(processJob(JOB_ID)).rejects.toThrow("Intentional failure test");

    // Le job a été passé en PROCESSING, mais jamais en COMPLETED.
    expect(prisma.job.update).toHaveBeenCalledTimes(1);
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: JOB_ID },
      data: { status: "PROCESSING" },
    });
  });

  it("échoue si le job n'existe pas en base", async () => {
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

    await expect(processJob(JOB_ID)).rejects.toThrow("Job not found");

    expect(prisma.job.update).not.toHaveBeenCalled();
  });
});
