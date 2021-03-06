import { ApiProperty } from "@nestjs/swagger";

import { ProblemMetaDto } from "./problem-meta.dto";
import { ProblemSampleDataMemberDto } from "./problem-sample-data-member.dto";
import { ProblemJudgeInfo } from "../type/problem-judge-info.interface";
import { ProblemFileDto } from "./problem-file.dto";
import { ProblemLocalizedContentDto } from "./problem-statement.dto";
import { ProblemPermissionType, ProblemPermissionLevel } from "@/problem/problem.service";
import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";

export enum GetProblemResponseError {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM"
}

export class ProblemPermissionOfCurrentUserDto {
  @ApiProperty({ required: false })
  [ProblemPermissionType.VIEW]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MODIFY]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MANAGE_PERMISSION]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.MANAGE_PUBLICNESS]?: boolean;
  @ApiProperty({ required: false })
  [ProblemPermissionType.DELETE]?: boolean;
}

class ProblemUserPermissionDto {
  @ApiProperty()
  user: UserMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

class ProblemGroupPermissionDto {
  @ApiProperty()
  group: GroupMetaDto;

  @ApiProperty({ enum: Object.values(ProblemPermissionLevel).filter(x => typeof x === "number") })
  permissionLevel: ProblemPermissionLevel;
}

class ProblemPermissions {
  @ApiProperty({ type: [ProblemUserPermissionDto] })
  userPermissions: ProblemUserPermissionDto[];

  @ApiProperty({ type: [ProblemGroupPermissionDto] })
  groupPermissions: ProblemGroupPermissionDto[];
}

export class GetProblemResponseDto {
  @ApiProperty({ enum: GetProblemResponseError })
  error?: GetProblemResponseError;

  @ApiProperty()
  meta?: ProblemMetaDto;

  @ApiProperty()
  owner?: UserMetaDto;

  @ApiProperty()
  localizedContentsOfLocale?: ProblemLocalizedContentDto;

  @ApiProperty({ type: ProblemLocalizedContentDto, isArray: true })
  localizedContentsOfAllLocales?: ProblemLocalizedContentDto[];

  @ApiProperty({ type: ProblemSampleDataMemberDto, isArray: true })
  samples?: ProblemSampleDataMemberDto[];

  @ApiProperty()
  judgeInfo?: ProblemJudgeInfo;

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  testData?: ProblemFileDto[];

  @ApiProperty({ type: ProblemFileDto, isArray: true })
  additionalFiles?: ProblemFileDto[];

  @ApiProperty()
  permissionOfCurrentUser?: ProblemPermissionOfCurrentUserDto;

  @ApiProperty()
  permissions?: ProblemPermissions;
}
