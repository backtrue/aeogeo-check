
import { executeStep1 } from '../steps/Step1';
import { runStep2 } from '../steps/Step2';
import { runStep3 } from '../steps/Step3';
import { runStep4 } from '../steps/Step4';
import { runStep5 } from '../steps/Step5';
import { runStep6 } from '../steps/Step6';
import { saveToDB, normalizeUrl } from '../utils/helpers';

/**
 * AEO 診斷管線調度員 (單一檔案架構版)
 */
export const diagnosticPipeline = {
  async run(stepNumber, context) {
    const { url, apiKeys, result } = context;
    const normalized = normalizeUrl(url);
    let data;

    switch (stepNumber) {
      case 1:
        data = await executeStep1(normalized, apiKeys);
        break;
      case 2:
        data = await runStep2(apiKeys, result.step1);
        break;
      case 3:
        data = await runStep3(apiKeys, result.step1, result.step2);
        break;
      case 4:
        data = await runStep4(apiKeys, result.step1, result.step3);
        break;
      case 5:
        data = await runStep5(apiKeys, result.step3, result.step4);
        break;
      case 6:
        data = await runStep6(apiKeys, result.step1, result.step5);
        break;
      default:
        throw new Error(`未知的步驟: ${stepNumber}`);
    }

    if (data) {
      const updatedResult = { ...result, url: normalized, [`step${stepNumber}`]: data };
      saveToDB(normalized, updatedResult);
      return updatedResult;
    }
    return result;
  }
};
