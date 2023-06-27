import { Configuration, OpenAIApi } from "openai";
import fs from "fs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { PDFExtract, PDFExtractOptions } from "pdf.js-extract";

import { Message, QuestionAnswerJson } from "./types";
import { contentByVectorId } from "../../pinecone/extractContentById";

// openai configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_APIKEY,
});
const openai = new OpenAIApi(configuration);
console.log("-----------", openai);

// Read file content
const fileContent = fs.readFileSync("./db.json", "utf-8");

// Parse JSON data
const jsonData: QuestionAnswerJson = JSON.parse(fileContent);

async function runCompletion(message: Array<Message>) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
    max_tokens: 256,
    temperature: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    top_p: 1,
    messages: message,
  });
  const result = completion.data.choices[0].message?.content;
  if (!result) {
    throw new Error("Empty Response from openai");
  }
  return result;
}

// function to get list of all question with id
export async function getQuestionListWithIds() {
  const output = Object.keys(jsonData).map((key) => {
    return {
      id: key,
      question: jsonData[key].question,
    };
  });
  return output;
}

// function to analyse answers by openai
export async function analyseAnswerByQuestionId(request: {
  questionId: string;
  answer: string;
}) {
  const objectOfQuestionId = jsonData[request.questionId];
  if (!objectOfQuestionId) {
    return { result: "Invalid QuestionId" };
  }
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a system that evaluates the answer given by the user with the correct answer below using Australian rubric system and outputs in JSON using the below format. \n\nformat\n{\n  grade: out of 5,\n  feedback\n}\n\nCorrect Answer:${objectOfQuestionId.answer}`,
    },
    {
      role: "user",
      content: `Evaluate this answer based on system's correct answer,${request.answer}`,
    },
  ];
  console.log("===================Input Message Body====>", messages);
  const response = await runCompletion(messages);
  const parsedResult = JSON.parse(response);
  console.log("=============Analyised Response================>", parsedResult);
  return parsedResult;
}

// function to analyse answer and question by openai

export async function analyseQuestionAnswerByQpenAi(request: {
  questionId: string;
  answer: string;
}) {
  const objectOfQuestionId = jsonData[request.questionId];
  if (!objectOfQuestionId) {
    return { result: "Invalid QuestionId" };
  }
  const messages: Message[] = [
    {
      role: "system",
      content: `You are a system that evaluates the answer given by the user using Australian rubric system and outputs in JSON using the below format. \n\nformat\n{\n  grade: out of 5,\n  feedback\n}`,
    },
    {
      role: "user",
      content: `Evaluate this answer of this question where question :${objectOfQuestionId.question}and answer:${request.answer}`,
    },
  ];
  console.log("===================Message Body===>", messages);
  const response = await runCompletion(messages);
  const parsedResult = JSON.parse(response);
  console.log(
    "=============Analyised Response for Question and Answer================>",
    parsedResult
  );
  return parsedResult;
}

// function to extract text from pdf and filter important data

export async function extractDataFromPdf() {
  const pdfExtract = new PDFExtract();
  const options: PDFExtractOptions = {
    normalizeWhitespace: true,
    disableCombineTextItems: true,
  };
  const output = await pdfExtract
    .extract("physics.pdf", options)
    .then((data) => {
      const str = data.pages
        .map((x) => x.content.map((y) => y.str).join(" "))
        .join(" ");
      const result = str
        .replace(/{\[BEGIN]}/g, "\n{[BEGIN]}\n")
        .replace(/{\[END]}/g, "\n{[END]}\n")
        .match(/^{\[BEGIN\]}[\s\S]*?{\[END\]}$/gm)
        ?.map(
          (v) => `${v.replace(/{\[BEGIN]}/g, "").replace(/{\[END]}/g, "")}`
        );

      return { fileName: data.filename, result };
    })
    .catch((err) => console.log(err));
  return output;
}

export async function filterDataInFormat(inputData: string[]) {
  const finalResultArray = inputData
    .map((input) => {
      const keyResult: string[] =
        input
          .replace(/{\[CHAPTER-START]}/g, "\n{[CHAPTER-START]}\n")
          .replace(/{\[CHAPTER-END]}/g, "\n{[CHAPTER-END]}\n")
          .match(/^{\[CHAPTER-START\]}[\s\S]*?{\[CHAPTER-END\]}$/gm)
          ?.map((v) =>
            v
              .replace(/{\[CHAPTER-START]}/g, "")
              .replace(/{\[CHAPTER-END]}/g, "")
          ) ?? [];
      const valueResult: string = input
        .replace(/{\[CHAPTER-END]}/g, "")
        .replace(/{\[CHAPTER-START]}/g, "");

      if (keyResult && keyResult.length > 0 && valueResult) {
        return {
          title: keyResult[0].replace(/\n/g, "").trim(),
          content: valueResult.replace(/\n/g, "").trim(),
        };
      }
      return null;
    })
    .filter((data) => data !== null) as { title: string; content: string }[];

  return finalResultArray;
}

export async function extractContentById(namespace: string, id: string) {
  const result: string = await contentByVectorId(namespace, id);
  const messageOption: Message[] = [
    {
      role: "system",
      content: `You are a system that generate the summarize response of this conent in key points format with numbering:${result}`,
    },
  ];
  const responseByChatCompletion: string = await runCompletion(messageOption);
  console.log(
    "======================SummarizedContent==================>",
    responseByChatCompletion
  );
  return {
    DetailedContent: result.replace(/\n/g, "").trim(),
    SummarizedContent: responseByChatCompletion.replace(/\n/g, "").trim(),
  };
}
