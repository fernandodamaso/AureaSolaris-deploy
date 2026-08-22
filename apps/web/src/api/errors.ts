export type ApiProblemField = Readonly<{
  location?: string[];
  message?: string;
  type?: string;
}>;

export class ApiProblem extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly fields: readonly ApiProblemField[];

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null = null,
    fields: readonly ApiProblemField[] = [],
  ) {
    super(message);
    this.name = 'ApiProblem';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fields = fields;
  }
}
