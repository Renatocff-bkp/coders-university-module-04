import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { CreateConnectorFromFileUseCase } from "../application/create-connector-from-file.use-case";

@Controller("connectors")
export class UploadConnectorHandler {
  constructor(
    private readonly createFromFile: CreateConnectorFromFileUseCase,
  ) {}

  @Post("upload")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async execute(
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() request: RequestWithContext,
  ) {
    const userId = request.user?.id ?? "";
    return this.createFromFile.execute({ userId, file });
  }
}
