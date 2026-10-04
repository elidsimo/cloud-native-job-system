import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// On remplace la base de données et Redis par des "faux" (mocks).
// Ces déclarations sont automatiquement remontées avant les imports.
vi.mock("../src/repositories/job.repository", () => ({
  jobRepository: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("../src/queues/job.queue", () => ({
  jobQueue: {
    add: vi.fn(),
  },
}));

import app from "../src/app";
import { jobRepository } from "../src/repositories/job.repository";
import { jobQueue } from "../src/queues/job.queue";

const fakeJob = {
  id: "11111111-1111-1111-1111-111111111111",
  type: "TEXT_PROCESSING",
  status: "PENDING",
  payload: { text: "Hello Cloud Native" },
  result: null,
  error: null,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /health", () => {
  it("répond 200 avec le statut OK", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.service).toBe("api-service");
  });
});

describe("GET /metrics", () => {
  it("expose les métriques Prometheus", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toContain("jobs_created_total");
  });
});

describe("POST /jobs", () => {
  it("crée un job et l'ajoute à la file (201)", async () => {
    vi.mocked(jobRepository.create).mockResolvedValue(fakeJob as any);

    const res = await request(app)
      .post("/jobs")
      .send({ type: "TEXT_PROCESSING", payload: { text: "Hello Cloud Native" } });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.job.id).toBe(fakeJob.id);

    expect(jobRepository.create).toHaveBeenCalledTimes(1);
    expect(jobQueue.add).toHaveBeenCalledTimes(1);
    expect(jobQueue.add).toHaveBeenCalledWith(
      "process-job",
      { jobId: fakeJob.id },
      expect.objectContaining({ attempts: 3 })
    );
  });

  it("refuse un job dont le texte est vide (400)", async () => {
    const res = await request(app)
      .post("/jobs")
      .send({ type: "TEXT_PROCESSING", payload: { text: "   " } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Job text is required");

    expect(jobRepository.create).not.toHaveBeenCalled();
    expect(jobQueue.add).not.toHaveBeenCalled();
  });

  it("refuse un job sans payload (400)", async () => {
    const res = await request(app).post("/jobs").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Job text is required");
  });
});

describe("GET /jobs/:id", () => {
  it("retourne le job s'il existe (200)", async () => {
    vi.mocked(jobRepository.findById).mockResolvedValue(fakeJob as any);

    const res = await request(app).get(`/jobs/${fakeJob.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.id).toBe(fakeJob.id);
  });

  it("retourne 404 si le job n'existe pas", async () => {
    vi.mocked(jobRepository.findById).mockResolvedValue(null);

    const res = await request(app).get("/jobs/inconnu");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Job not found");
  });
});
