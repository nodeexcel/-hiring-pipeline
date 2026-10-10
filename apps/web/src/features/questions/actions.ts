"use server";
import { revalidatePath } from "next/cache";
import { done, failed, type ActionState } from "@/lib/action-state";
import { parseForm } from "@/lib/form";
import { adminDb } from "@/server/db/admin";
import { requireAdmin } from "@/server/auth";
import { activeSchema, bulkActivateSchema, idSchema, mcqSchema, parseTestCases, problemSchema, taskSchema, topicsSchema } from "./schemas";

const PATH = "/admin/questions";

export async function addMcq(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, mcqSchema);
  if (error) return error;
  const { error: dbError } = await adminDb().from("aptitude_questions").insert({
    section: data.section,
    topic: data.topic,
    difficulty: data.difficulty,
    body: data.body,
    options: data.options,
    answer_index: data.answer - 1,
  });
  if (dbError) return failed("Could not add the question.");
  revalidatePath(PATH);
  return done("Question added.");
}

export async function addProblem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, problemSchema);
  if (error) return error;
  const parsedTopics = topicsSchema.safeParse(formData.getAll("topics"));
  if (!parsedTopics.success) return failed(parsedTopics.error.issues[0]?.message ?? "Choose valid topics.");
  if (parsedTopics.data.length === 0) return failed("topics: choose at least one DSA topic.");
  const cases = parseTestCases(data.tests, data.visible);
  if (cases.length === 0) return failed("tests: add at least one case in the input => expected format.");

  const db = adminDb();
  const { data: problem, error: dbError } = await db
    .from("coding_problems")
    .insert({
      title: data.title,
      statement: data.statement,
      difficulty: data.difficulty,
      topics: parsedTopics.data,
      starter_code: { javascript: data.js, python: data.py, java: data.java, cpp: data.cpp },
    })
    .select("id")
    .single();
  if (dbError || !problem) return failed("Could not add the problem.");

  const { error: casesError } = await db.from("coding_testcases").insert(cases.map((c) => ({ ...c, problem_id: problem.id })));
  if (casesError) {
    await db.from("coding_problems").delete().eq("id", problem.id); // do not leave a problem with no tests
    return failed("Could not save the test cases.");
  }
  revalidatePath(PATH);
  return done(`Problem added with ${cases.length} test case(s).`);
}

export async function addTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, taskSchema);
  if (error) return error;
  const { error: dbError } = await adminDb().from("machine_tasks").insert(data);
  if (dbError) return failed("Could not add the task.");
  revalidatePath(PATH);
  return done("Task added.");
}

async function remove(table: "aptitude_questions" | "coding_problems" | "machine_tasks", formData: FormData) {
  await requireAdmin();
  const { data, error } = parseForm(formData, idSchema);
  if (error) return error;
  const { error: dbError } = await adminDb().from(table).delete().eq("id", data.id);
  if (dbError) return failed("Could not delete it. It may still be in use.");
  revalidatePath(PATH);
  return done("Deleted.");
}

export async function deleteQuestion(_prev: ActionState, formData: FormData) {
  return remove("aptitude_questions", formData);
}
export async function deleteProblem(_prev: ActionState, formData: FormData) {
  return remove("coding_problems", formData);
}
export async function deleteTask(_prev: ActionState, formData: FormData) {
  return remove("machine_tasks", formData);
}

async function setActive(table: "aptitude_questions" | "coding_problems" | "machine_tasks", formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, activeSchema);
  if (error) return error;
  const { error: dbError } = await adminDb().from(table).update({ active: data.active }).eq("id", data.id);
  if (dbError) return failed("Could not update it.");
  revalidatePath(PATH);
  return done();
}

export async function setQuestionActive(_prev: ActionState, formData: FormData) {
  return setActive("aptitude_questions", formData);
}
export async function setProblemActive(_prev: ActionState, formData: FormData) {
  return setActive("coding_problems", formData);
}
export async function setTaskActive(_prev: ActionState, formData: FormData) {
  return setActive("machine_tasks", formData);
}

/**
 * Enables the drafts in one bank, optionally limited to a section and/or topic so a reviewer
 * can approve topic by topic. Only reviewed content should be enabled this way.
 */
export async function activateAllDrafts(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, bulkActivateSchema);
  if (error) return error;
  const db = adminDb();

  let query;
  if (data.kind === "questions") {
    query = db.from("aptitude_questions").update({ active: true }).eq("active", false);
    if (data.section) query = data.section === "Uncategorised" ? query.is("section", null) : query.eq("section", data.section);
    if (data.topic) query = query.eq("topic", data.topic);
  } else if (data.kind === "problems") {
    query = db.from("coding_problems").update({ active: true }).eq("active", false);
    if (data.topic) query = data.topic === "Uncategorised" ? query.filter("topics", "eq", "{}") : query.contains("topics", [data.topic]);
  } else {
    query = db.from("machine_tasks").update({ active: true }).eq("active", false);
  }
  const { data: rows, error: dbError } = await query.select("id");
  if (dbError) return failed("Could not enable the drafts.");
  revalidatePath(PATH);
  return done(`Enabled ${rows?.length ?? 0} item(s).`);
}
