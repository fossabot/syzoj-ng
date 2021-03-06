import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository, FindConditions, FindManyOptions, EntityManager } from "typeorm";

import { UserEntity } from "@/user/user.entity";
import { GroupEntity } from "@/group/group.entity";
import { LocalizedContentService } from "@/localized-content/localized-content.service";
import { ProblemEntity, ProblemType } from "./problem.entity";
import { ProblemJudgeInfoEntity } from "./problem-judge-info.entity";
import { ProblemSampleEntity } from "./problem-sample.entity";
import { ProblemFileType, ProblemFileEntity } from "./problem-file.entity";
import { ProblemStatisticsEntity } from "./problem-statistics.entity";
import { ProblemJudgeInfoService } from "./type/problem-judge-info.service";
import {
  ProblemStatementDto,
  UpdateProblemStatementRequestDto,
  ProblemLocalizedContentDto,
  ProblemFileDto
} from "./dto";
import { LocalizedContentType } from "@/localized-content/localized-content.entity";
import { Locale } from "@/common/locale.type";
import { ProblemContentSection } from "./problem-content.interface";
import { ProblemSampleData } from "./problem-sample-data.interface";
import { ProblemJudgeInfo } from "./type/problem-judge-info.interface";
import { UserPrivilegeService, UserPrivilegeType } from "@/user/user-privilege.service";
import { PermissionService, PermissionObjectType } from "@/permission/permission.service";
import { UserService } from "@/user/user.service";
import { GroupService } from "@/group/group.service";
import { FileService } from "@/file/file.service";
import { ConfigService } from "@/config/config.service";

export enum ProblemPermissionType {
  VIEW = "VIEW",
  MODIFY = "MODIFY",
  MANAGE_PERMISSION = "MANAGE_PERMISSION",
  MANAGE_PUBLICNESS = "MANAGE_PUBLICNESS",
  DELETE = "DELETE"
}

export enum ProblemPermissionLevel {
  READ = 1,
  WRITE = 2
}

@Injectable()
export class ProblemService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ProblemEntity)
    private readonly problemRepository: Repository<ProblemEntity>,
    @InjectRepository(ProblemJudgeInfoEntity)
    private readonly problemJudgeInfoRepository: Repository<ProblemJudgeInfoEntity>,
    @InjectRepository(ProblemSampleEntity)
    private readonly problemSampleRepository: Repository<ProblemSampleEntity>,
    @InjectRepository(ProblemFileEntity)
    private readonly problemFileRepository: Repository<ProblemFileEntity>,
    @InjectRepository(ProblemStatisticsEntity)
    private readonly problemStatisticsRepository: Repository<ProblemStatisticsEntity>,
    private readonly problemJudgeInfoService: ProblemJudgeInfoService,
    private readonly localizedContentService: LocalizedContentService,
    private readonly userPrivilegeService: UserPrivilegeService,
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly permissionService: PermissionService,
    private readonly fileService: FileService,
    private readonly configService: ConfigService
  ) {}

  async findProblemById(id: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne(id);
  }

  async findProblemByDisplayId(displayId: number): Promise<ProblemEntity> {
    return this.problemRepository.findOne({
      displayId: displayId
    });
  }

  async userHasPermission(user: UserEntity, problem: ProblemEntity, type: ProblemPermissionType): Promise<boolean> {
    switch (type) {
      // Everyone can read a public problem
      // Owner, admins and those who has read permission can view a non-public problem
      case ProblemPermissionType.VIEW:
        if (problem.isPublic) return true;
        else if (!user) return false;
        else if (user.id === problem.ownerId) return true;
        else if (user.isAdmin) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            problem.id,
            PermissionObjectType.PROBLEM,
            ProblemPermissionLevel.READ
          );

      // Owner, admins and those who has write permission can modify a problem
      case ProblemPermissionType.MODIFY:
        if (!user) return false;
        else if (user.id === problem.ownerId) return true;
        else if (user.isAdmin) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) return true;
        else
          return await this.permissionService.userOrItsGroupsHavePermission(
            user,
            problem.id,
            PermissionObjectType.PROBLEM,
            ProblemPermissionLevel.WRITE
          );

      // Admins can manage a problem's permission
      // Controlled by the application preference, the owner may have the permission
      case ProblemPermissionType.MANAGE_PERMISSION:
        if (!user) return false;
        else if (user.id === problem.ownerId && this.configService.config.preference.allowOwnerManageProblemPermission)
          return true;
        else if (user.isAdmin) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) return true;
        else return false;

      // Admins can manage a problem's publicness (set display id / make public or non-public)
      case ProblemPermissionType.MANAGE_PUBLICNESS:
        if (!user) return false;
        else if (user.isAdmin) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) return true;
        else return false;

      // Admins can delete a problem
      // Controlled by the application preference, the owner may have the permission
      case ProblemPermissionType.DELETE:
        if (!user) return false;
        else if (user.id === problem.ownerId && this.configService.config.preference.allowOwnerDeleteProblem)
          return true;
        else if (user.isAdmin) return true;
        else if (await this.userPrivilegeService.userHasPrivilege(user, UserPrivilegeType.MANAGE_PROBLEM)) return true;
        else return false;
    }
  }

  async queryProblemsAndCount(skipCount: number, takeCount: number): Promise<[ProblemEntity[], number]> {
    let findOptions: FindManyOptions<ProblemEntity> = {
      order: {
        displayId: "ASC"
      },
      skip: skipCount,
      take: takeCount
    };
    findOptions.where = { isPublic: true };
    return await this.problemRepository.findAndCount(findOptions);
  }

  async createProblem(owner: UserEntity, type: ProblemType, statement: ProblemStatementDto): Promise<ProblemEntity> {
    let problem: ProblemEntity;
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      problem = new ProblemEntity();
      problem.displayId = null;
      problem.type = type;
      problem.isPublic = false;
      problem.ownerId = owner.id;
      problem.locales = statement.localizedContents.map(localizedContent => localizedContent.locale);
      await transactionalEntityManager.save(problem);

      const problemJudgeInfo = new ProblemJudgeInfoEntity();
      problemJudgeInfo.problemId = problem.id;
      problemJudgeInfo.judgeInfo = this.problemJudgeInfoService.getDefaultJudgeInfo(type);
      await transactionalEntityManager.save(problemJudgeInfo);

      const problemSample = new ProblemSampleEntity();
      problemSample.problemId = problem.id;
      problemSample.data = statement.samples;
      await transactionalEntityManager.save(problemSample);

      const problemStatistics = new ProblemStatisticsEntity();
      problemStatistics.problemId = problem.id;
      problemStatistics.submissionCount = 0;
      problemStatistics.acceptedSubmissionCount = 0;
      await transactionalEntityManager.save(problemStatistics);

      for (const localizedContent of statement.localizedContents) {
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.PROBLEM_TITLE,
          localizedContent.locale,
          localizedContent.title,
          transactionalEntityManager
        );
        await this.localizedContentService.createOrUpdate(
          problem.id,
          LocalizedContentType.PROBLEM_CONTENT,
          localizedContent.locale,
          JSON.stringify(localizedContent.contentSections),
          transactionalEntityManager
        );
      }
    });

    return problem;
  }

  async updateProblemStatement(problem: ProblemEntity, request: UpdateProblemStatementRequestDto): Promise<boolean> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      if (request.samples != null) {
        const problemSample = await transactionalEntityManager.findOne(ProblemSampleEntity, {
          problemId: problem.id
        });
        problemSample.data = request.samples;
        await transactionalEntityManager.save(problemSample);
      }

      const newLocales = request.localizedContents.map(localizedContent => localizedContent.locale);

      const deletingLocales = problem.locales.filter(locale => !newLocales.includes(locale));
      for (const deletingLocale of deletingLocales) {
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.PROBLEM_TITLE,
          deletingLocale,
          transactionalEntityManager
        );
        await this.localizedContentService.delete(
          problem.id,
          LocalizedContentType.PROBLEM_CONTENT,
          deletingLocale,
          transactionalEntityManager
        );
      }

      problem.locales = newLocales;

      for (const localizedContent of request.localizedContents) {
        // Update if not null
        if (localizedContent.title != null)
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_TITLE,
            localizedContent.locale,
            localizedContent.title
          );
        if (localizedContent.contentSections != null)
          await this.localizedContentService.createOrUpdate(
            problem.id,
            LocalizedContentType.PROBLEM_CONTENT,
            localizedContent.locale,
            JSON.stringify(localizedContent.contentSections)
          );
      }

      await transactionalEntityManager.save(problem);
    });

    return true;
  }

  async updateProblemJudgeInfo(problem: ProblemEntity, judgeInfo: ProblemJudgeInfo): Promise<void> {
    const problemJudgeInfo = await this.problemJudgeInfoRepository.findOne({
      problemId: problem.id
    });

    problemJudgeInfo.judgeInfo = judgeInfo;
    await this.problemJudgeInfoRepository.save(problemJudgeInfo);
  }

  // Get a problem's title of a locale. If no title for this locale returns any one.
  async getProblemLocalizedTitle(problem: ProblemEntity, locale: Locale): Promise<string> {
    return await this.localizedContentService.get(problem.id, LocalizedContentType.PROBLEM_TITLE, locale);
  }

  // Get a problem's content of a locale. If no content for this locale returns any one.
  async getProblemLocalizedContent(problem: ProblemEntity, locale: Locale): Promise<ProblemContentSection[]> {
    const data = await this.localizedContentService.get(problem.id, LocalizedContentType.PROBLEM_CONTENT, locale);
    if (data != null) return JSON.parse(data);
    else return null;
  }

  async getProblemAllLocalizedContents(problem: ProblemEntity): Promise<ProblemLocalizedContentDto[]> {
    const titles = await this.localizedContentService.getOfAllLocales(problem.id, LocalizedContentType.PROBLEM_TITLE);
    const contents = await this.localizedContentService.getOfAllLocales(
      problem.id,
      LocalizedContentType.PROBLEM_CONTENT
    );
    return Object.keys(titles).map((locale: Locale) => ({
      locale: locale,
      title: titles[locale],
      contentSections: JSON.parse(contents[locale])
    }));
  }

  async getProblemSamples(problem: ProblemEntity): Promise<ProblemSampleData> {
    const problemSample = await problem.sample;
    return problemSample.data;
  }

  async getProblemJudgeInfo(problem: ProblemEntity): Promise<ProblemJudgeInfo> {
    const problemJudgeInfo = await problem.judgeInfo;
    return problemJudgeInfo.judgeInfo;
  }

  async setProblemPermissions(
    problem: ProblemEntity,
    userPermissions: [UserEntity, ProblemPermissionLevel][],
    groupPermissions: [GroupEntity, ProblemPermissionLevel][]
  ): Promise<void> {
    await this.permissionService.replaceUsersAndGroupsPermissionForObject(
      problem.id,
      PermissionObjectType.PROBLEM,
      userPermissions,
      groupPermissions
    );
  }

  async getProblemPermissions(
    problem: ProblemEntity
  ): Promise<[[UserEntity, ProblemPermissionLevel][], [GroupEntity, ProblemPermissionLevel][]]> {
    const [
      userPermissionList,
      groupPermissionList
    ] = await this.permissionService.getUserAndGroupPermissionListOfObject<ProblemPermissionLevel>(
      problem.id,
      PermissionObjectType.PROBLEM
    );
    return [
      await Promise.all(
        userPermissionList.map(
          async ([userId, permission]): Promise<[UserEntity, ProblemPermissionLevel]> => [
            await this.userService.findUserById(userId),
            permission
          ]
        )
      ),
      await Promise.all(
        groupPermissionList.map(
          async ([groupId, permission]): Promise<[GroupEntity, ProblemPermissionLevel]> => [
            await this.groupService.findGroupById(groupId),
            permission
          ]
        )
      )
    ];
  }

  async setProblemDisplayId(problem: ProblemEntity, displayId: number): Promise<boolean> {
    if (!displayId) displayId = null;
    if (problem.displayId === displayId) return true;

    try {
      problem.displayId = displayId;
      await this.problemRepository.save(problem);
      return true;
    } catch (e) {
      if (
        await this.problemRepository.count({
          displayId: displayId
        })
      )
        return false;

      throw e;
    }
  }

  async setProblemPublic(problem: ProblemEntity, isPublic: boolean): Promise<void> {
    if (problem.isPublic === isPublic) return;

    problem.isPublic = isPublic;
    await this.problemRepository.save(problem);
  }

  async addProblemFile(
    problem: ProblemEntity,
    sha256: string,
    type: ProblemFileType,
    filename: string
  ): Promise<boolean> {
    return await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      const uuid = await this.fileService.tryReferenceFile(sha256, transactionalEntityManager);
      if (!uuid) {
        return false;
      }

      let problemFile = await this.problemFileRepository.findOne({
        problemId: problem.id,
        type: type,
        filename: filename
      });
      if (problemFile) {
        // Rereference old file
        await this.fileService.dereferenceFile(problemFile.uuid, transactionalEntityManager);
      } else {
        problemFile = new ProblemFileEntity();
        problemFile.problemId = problem.id;
        problemFile.type = type;
        problemFile.filename = filename;
      }

      problemFile.uuid = uuid;
      await transactionalEntityManager.save(ProblemFileEntity, problemFile);

      return true;
    });
  }

  async removeProblemFiles(problem: ProblemEntity, type: ProblemFileType, filenames: string[]): Promise<void> {
    await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
      for (const filename of filenames) {
        const problemFile = await transactionalEntityManager.findOne(ProblemFileEntity, {
          problemId: problem.id,
          type: type,
          filename: filename
        });

        if (!problemFile) continue;

        await transactionalEntityManager.remove(ProblemFileEntity, problemFile);
        await this.fileService.dereferenceFile(problemFile.uuid, transactionalEntityManager);
      }
    });
  }

  async listProblemFiles(
    problem: ProblemEntity,
    type: ProblemFileType,
    withSize: boolean = false
  ): Promise<ProblemFileDto[]> {
    const problemFiles: ProblemFileDto[] = await this.problemFileRepository.find({
      problemId: problem.id,
      type: type
    });

    if (withSize) {
      const fileSizes = await this.fileService.getFileSizes(problemFiles.map(problemFile => problemFile.uuid));
      return problemFiles.map((problemFile, i) => ({
        ...problemFile,
        size: fileSizes[i]
      }));
    }

    return problemFiles;
  }

  async renameProblemFile(
    problem: ProblemEntity,
    type: ProblemFileType,
    filename: string,
    newFilename: string
  ): Promise<boolean> {
    const problemFile = await this.problemFileRepository.findOne({
      problemId: problem.id,
      type: type,
      filename: filename
    });

    if (!problemFile) return false;

    // Since filename is a PRIMARY key, use .save() will create another record
    await this.problemFileRepository.update(problemFile, {
      filename: newFilename
    });

    return true;
  }

  async updateProblemStatistics(
    problem: ProblemEntity,
    incSubmissionCount: number,
    incAcceptedSubmissionCount: number,
    transactionalEntityManager: EntityManager
  ): Promise<void> {
    if (incSubmissionCount !== 0)
      await transactionalEntityManager.increment(
        ProblemStatisticsEntity,
        { problemId: problem.id },
        "submissionCount",
        incSubmissionCount
      );

    if (incAcceptedSubmissionCount !== 0)
      await transactionalEntityManager.increment(
        ProblemStatisticsEntity,
        { problemId: problem.id },
        "acceptedSubmissionCount",
        incAcceptedSubmissionCount
      );
  }
}
