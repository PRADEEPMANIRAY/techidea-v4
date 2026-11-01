"use client";

import { useEffect, useRef, useState } from "react";
import { calculateNepalGpa, customNepalGrades, type Subject } from "@/lib/nepal/gpa";
import type { Grade } from "@/lib/pakistan/gpa";
import { gpaIssue, type GpaIssue } from "@/lib/nepal/gpa-feedback";
import { OutputActions } from "./utility-actions";

const initial = (): Subject[] => [{ id: "first", name: "", credits: "1", gradeId: "" }];

export function NepalGpa() {
  const [subjects, setSubjects] = useState(initial);
  const [grades, setGrades] = useState<Grade[]>(() => customNepalGrades.map((grade) => ({ ...grade })));
  const [maximum, setMaximum] = useState("4");
  const [result, setResult] = useState<ReturnType<typeof calculateNepalGpa> | null>(null);
  const [issue, setIssue] = useState<GpaIssue | null>(null);
  const serial = useRef(0);

  useEffect(() => {
    if (!issue) return;
    const field = issue.field ? document.getElementById(issue.field) : null;
    const details = field?.closest("details");
    if (details) details.open = true;
    (field ?? document.getElementById("nepal-form-error"))?.focus();
  }, [issue]);

  function attrs(id: string) {
    return {
      id,
      "aria-invalid": issue?.field === id,
      "aria-describedby": issue?.field === id ? `${id}-error` : undefined,
    };
  }

  function errorFor(id: string) {
    return issue?.field === id ? <p className="utility-error" id={`${id}-error`}>{issue.message}</p> : null;
  }

  function clear() {
    setResult(null);
    setIssue(null);
  }

  function update(id: string, patch: Partial<Subject>) {
    clear();
    setSubjects((previous) => previous.map((subject) => subject.id === id ? { ...subject, ...patch } : subject));
  }

  return <div className="nepal-tool utility-tool">
    <p className="nepal-kicker">CUSTOM GRADING • YOUR SCHOOL’S RULE</p>
    <p className="notice">Not an official NEB result. Verify your school’s rule; A–F values are examples.</p>
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      try {
        setResult(calculateNepalGpa(subjects, grades, maximum));
        setIssue(null);
      } catch (error) {
        setResult(null);
        setIssue(gpaIssue(error, subjects, grades));
      }
    }}>
      {subjects.map((subject, index) => (
        <fieldset className="nepal-subject" key={subject.id}>
          <legend>Subject {index + 1}</legend>
          <div className="utility-options">
            <label className="field">Subject {index + 1} name (optional)
              <input {...attrs(`nepal-subject-${subject.id}-name`)} value={subject.name} maxLength={80} onChange={(event) => update(subject.id, { name: event.target.value })} />
            </label>
            {errorFor(`nepal-subject-${subject.id}-name`)}
            <label className="field">Subject {index + 1} credit hours
              <input {...attrs(`nepal-subject-${subject.id}-credits`)} inputMode="decimal" maxLength={5} value={subject.credits} onChange={(event) => update(subject.id, { credits: event.target.value })} />
            </label>
            {errorFor(`nepal-subject-${subject.id}-credits`)}
            <label className="field">Subject {index + 1} grade
              <select {...attrs(`nepal-subject-${subject.id}-grade`)} value={subject.gradeId} onChange={(event) => update(subject.id, { gradeId: event.target.value })}>
                <option value="">Choose grade</option>
                {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label || "Unnamed"} — {grade.points || "?"} points</option>)}
                <option value="NG">NG — no numeric calculation</option>
              </select>
            </label>
            {errorFor(`nepal-subject-${subject.id}-grade`)}
          </div>
          <button className="button button-light" type="button" disabled={subjects.length <= 1} aria-label={`Remove subject ${index + 1}`} onClick={() => {
            clear();
            setSubjects((previous) => previous.filter((row) => row.id !== subject.id));
          }}>Remove subject</button>
        </fieldset>
      ))}

      <details className="nepal-scale">
        <summary>Configure custom grading policy</summary>
        <label className="field">Maximum grade point
          <input {...attrs("nepal-maximum")} inputMode="decimal" maxLength={5} value={maximum} onChange={(event) => {
            clear();
            setMaximum(event.target.value);
          }} />
        </label>
        {errorFor("nepal-maximum")}
        <div className="utility-options">
          {grades.map((grade, index) => (
            <div key={grade.id}>
              <label className="field">Custom grade {index + 1} label
                <input {...attrs(`nepal-grade-${grade.id}-label`)} maxLength={12} value={grade.label} onChange={(event) => {
                  clear();
                  setGrades((previous) => previous.map((row) => row.id === grade.id ? { ...row, label: event.target.value } : row));
                }} />
              </label>
              {errorFor(`nepal-grade-${grade.id}-label`)}
              <label className="field">Custom grade {index + 1} points
                <input {...attrs(`nepal-grade-${grade.id}-points`)} inputMode="decimal" maxLength={5} value={grade.points} onChange={(event) => {
                  clear();
                  setGrades((previous) => previous.map((row) => row.id === grade.id ? { ...row, points: event.target.value } : row));
                }} />
              </label>
              {errorFor(`nepal-grade-${grade.id}-points`)}
              <button className="button button-light" type="button" disabled={grades.length <= 2} aria-label={`Remove custom grade ${index + 1}`} onClick={() => {
                clear();
                setGrades((previous) => previous.filter((row) => row.id !== grade.id));
                setSubjects((previous) => previous.map((row) => row.gradeId === grade.id ? { ...row, gradeId: "" } : row));
              }}>Remove grade</button>
            </div>
          ))}
        </div>
        <button className="button button-light" type="button" disabled={grades.length >= 20} onClick={() => {
          clear();
          setGrades((previous) => [...previous, { id: `g${++serial.current}`, label: "", points: "" }]);
        }}>Add grade</button>
      </details>

      <div className="utility-actions">
        <button className="button button-light" type="button" disabled={subjects.length >= 30} onClick={() => {
          clear();
          setSubjects((previous) => [...previous, { id: `s${++serial.current}`, name: "", credits: "1", gradeId: "" }]);
        }}>Add subject</button>
        <button className="button button-dark" type="submit">Calculate custom GPA</button>
        <button className="button button-light" type="button" onClick={() => {
          clear();
          setSubjects(initial());
          setGrades(customNepalGrades.map((grade) => ({ ...grade })));
          setMaximum("4");
        }}>Reset</button>
      </div>
    </form>

    {issue && <p role="alert" id="nepal-form-error" tabIndex={-1} className="utility-error">{issue.field ? "Review the highlighted field before calculating." : issue.message}</p>}
    {result && <>
      <div className="nepal-result" role="status">
        <span>Custom weighted GPA</span>
        <strong>{result.cgpa.toFixed(3)} / {result.maximum}</strong>
        <p>{result.totalQualityPoints.toFixed(4)} quality points ÷ {result.totalCredits} credits</p>
      </div>
      <div className="nepal-table" role="region" aria-label="Subject calculation breakdown" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Subject</th><th scope="col">Credits</th><th scope="col">Grade points</th><th scope="col">Weighted points</th></tr></thead>
          <tbody>{result.semesters[0].courses.map((course, index) => (
            <tr key={index}>
              <th scope="row">{subjects[index]?.name.trim() || `Subject ${index + 1}`}</th>
              <td>{course.credits}</td>
              <td>{course.gradePoints}</td>
              <td>{course.qualityPoints.toFixed(4)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <OutputActions output={JSON.stringify({ mode: "Custom — not official NEB", ...result }, null, 2)} name="nepal-custom-gpa.json" />
    </>}
    <p>Use already-established subject grades. This tool does not turn marks into NEB grades, certify a pass or substitute a numeric zero for NG. Up to 30 subjects, 30 credit hours per subject and two decimal places for points/credits.</p>
  </div>;
}
