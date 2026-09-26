import { Link } from "@tanstack/react-router";
import { getInterviewQuestions } from "~/lib/services/blog";

export function InterviewQuestionList() {
  const questions = getInterviewQuestions();

  return (
    <ul>
      {questions.map((question) => (
        <li key={question.slug}>
          <Link to="/$slug" params={{ slug: question.slug }}>
            {question.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
