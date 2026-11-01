import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth/interface/auth-guard";
import {
  CreateConnectorFromFileUseCase,
  CreateConnectorFromUrlUseCase,
} from "../application/create-connector.use-case";
import { ConnectorRepository } from "../infrastructure/connector.repository";

@Controller("connectors")
export class ConnectorsHandler {
  constructor(
    private readonly createFromFile: CreateConnectorFromFileUseCase,
    private readonly createFromUrl: CreateConnectorFromUrlUseCase,
    private readonly repo: ConnectorRepository,
  ) {}

  @Post("upload")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile()
    file: { originalname: string; mimetype: string; buffer: Buffer },
    @Req() request: RequestWithContext,
  ) {
    const userId = request.user?.id ?? "";
    return this.createFromFile.execute({ userId, file });
  }

  @Post("url")
  @UseGuards(AuthGuard)
  async fromUrl(
    @Req() request: RequestWithContext & { body?: { url?: string } },
  ) {
    const userId = request.user?.id ?? "";
    const url = request.body?.url ?? "";
    return this.createFromUrl.execute({ userId, url });
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() request: RequestWithContext) {
    const userId = request.user?.id ?? "";
    return this.repo.listByUser(userId);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async get(@Param("id") id: string) {
    return this.repo.findById(id);
  }
}
