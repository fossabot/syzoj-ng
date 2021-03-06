import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProblemEntity } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemController } from "./problem.controller";
import { ProblemService } from "./problem.service";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ProblemFileEntity } from "./problem-file.entity";
import { ProblemStatisticsEntity } from "./problem-statistics.entity";
import { ConfigModule } from "@/config/config.module";
import { LocalizedContentModule } from "@/localized-content/localized-content.module";
import { UserModule } from "@/user/user.module";
import { GroupModule } from "@/group/group.module";
import { PermissionModule } from "@/permission/permission.module";
import { FileModule } from "@/file/file.module";

import { ProblemJudgeInfoService } from "./type/problem-judge-info.service";
import { ProblemTypedJudgeInfoTraditionalService } from "./type/traditional/problem-typed-judge-info-traditional.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProblemEntity]),
    TypeOrmModule.forFeature([ProblemJudgeInfoEntity]),
    TypeOrmModule.forFeature([ProblemSampleEntity]),
    TypeOrmModule.forFeature([ProblemFileEntity]),
    TypeOrmModule.forFeature([ProblemStatisticsEntity]),
    ConfigModule,
    LocalizedContentModule,
    UserModule,
    GroupModule,
    PermissionModule,
    FileModule
  ],
  providers: [ProblemService, ProblemJudgeInfoService, ProblemTypedJudgeInfoTraditionalService],
  controllers: [ProblemController],
  exports: [ProblemService, ProblemJudgeInfoService]
})
export class ProblemModule {}
