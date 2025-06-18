// backend/src/types/index.ts
import { AxiosResponse } from 'axios';

export interface APISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    paths: Record<string, any>;
}

export interface TestCase {
    name: string;
    endpoint: string;
    method: string;
    params: Record<string, any>;
    expectedStatus: number;
    assertions: string[];
}

export interface ResponseData {
    status: number;
    statusText: string;
    headers: Record<string, any>;
    data: any;
}

export interface TestResult {
    testCase: TestCase;
    passed: boolean;
    duration: number;
    statusCode: number;
    error?: string;
    assertionResults: AssertionResult[];
    responseData: ResponseData;
}
export interface AssertionResult {
    assertion: string;
    passed: boolean;
    actual?: any;
    expected?: any;
    error?: string;
}

export interface TestSuiteConfig {
    name: string;
    baseUrl: string;
    apiSpec: APISpec;
}

export interface TestSuiteResult {
    id: string;
    config: TestSuiteConfig;
    results: TestResult[];
    startTime: Date;
    endTime: Date;
    summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    };
}