import { Injectable } from "@nestjs/common";
import { ValidationError, validate } from "class-validator";
import { plainToClass } from "class-transformer";

import { SubmissionTypedServiceInterface } from "../submission-typed-service.interface";
import { SubmissionContentTraditional } from "./submission-content-traditional.interface";
import { SubmissionTestcaseResultTraditional } from "./submission-testcase-result-traditional.interface";

@Injectable()
export class SubmissionTypeTraditionalService
  implements SubmissionTypedServiceInterface<SubmissionContentTraditional, SubmissionTestcaseResultTraditional> {
  constructor() {}

  public async validateSubmissionContent(submissionContent: SubmissionContentTraditional): Promise<ValidationError[]> {
    return validate(plainToClass(SubmissionContentTraditional, submissionContent));
  }

  public async getCodeLanguageAndAnswerSizeFromSubmissionContent(submissionContent: SubmissionContentTraditional) {
    return {
      language: submissionContent.language,

      // string.length returns the number of charactars in the string
      // Convert to a buffer to get the number of bytes
      answerSize: Buffer.from(submissionContent.code).length
    };
  }
}
