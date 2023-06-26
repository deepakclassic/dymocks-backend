import { RequestHandler } from "express";
import {
  analyseAnswerByQuestionId,
  analyseQuestionAnswerByQpenAi,
  extractDataFromPdf,
  filterDataInFormat,
  extractContentById,
  getQuestionListWithIds,
} from "./service";
import { createVectorIndex } from "../../pinecone/vectoreUpsert";

export const getQuestionList: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown
> = async (req, res) => {
  const questionList = await getQuestionListWithIds();
  return res.status(200).json({
    questionList,
  });
};

export const analyseAnswer: RequestHandler<
  unknown,
  unknown,
  {
    questionId: string;
    answer: string;
  },
  unknown
> = async (req, res) => {
  const { questionId, answer } = req.body;
  const analyzedResponse = await analyseAnswerByQuestionId({
    questionId,
    answer,
  });
  return res.status(200).json({
    response: analyzedResponse,
  });
};

export const analyseAnswerQuestion: RequestHandler<
  unknown,
  unknown,
  {
    questionId: string;
    answer: string;
  },
  unknown
> = async (req, res) => {
  const { questionId, answer } = req.body;
  const analyzedResponse = await analyseQuestionAnswerByQpenAi({
    questionId,
    answer,
  });
  return res.status(200).json({
    response: analyzedResponse,
  });
};

export const extractPdfData: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown
> = async (req, res) => {
  const extracatedData: void | {
    fileName: string | undefined;
    result: string[] | undefined;
  } = await extractDataFromPdf();
  if (
    extracatedData &&
    Array.isArray(extracatedData.result) &&
    extracatedData.fileName
  ) {
    const filterData = await filterDataInFormat(extracatedData.result);
    if (filterData) {
      const namespace: string = extracatedData.fileName.split(".")[0];
      // eslint-disable-next-line no-restricted-syntax, no-unreachable-loop
      for (const [index, text] of filterData.entries()) {
        // eslint-disable-next-line no-await-in-loop
        const result = await createVectorIndex(text, namespace, index);
        console.log(
          "++++++++++++++RESULT++++++++++++++++++++++",
          index,
          result
        );
        if (result.code) {
          return {
            status: 500,
            message: "Failed to upsert data into pinecone db",
          };
        }
      }
      return res.status(200).json({
        response: filterData.length,
        message: "Data upsert successfully",
      });
    }
    return res.status(500).json({ error: "Failed to filter extracted data" });
  }
  // Handle case where extractedData is undefined or not an array of strings
  return res.status(500).json({ error: "Failed to extract data from PDF" });
};

export const summarizeChapterData: RequestHandler<
  unknown,
  unknown,
  unknown,
  {
    namespace: string;
    vectorId: string;
  }
> = async (req, res) => {
  const { namespace, vectorId } = req.query;
  const contentById = await extractContentById(namespace, vectorId);
  if (contentById) {
    return res.status(200).json({
      response: contentById,
    });
  }
  return res.status(500).json({ error: "Failed to fetch content from db " });
};
