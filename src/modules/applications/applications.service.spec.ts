import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../prisma/prisma.mock';
import { ApplicationStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prisma: typeof prismaMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createManual', () => {
    it('should create a manual application successfully', async () => {
      const userId = 'user-123';
      const mockData = {
        title: 'Frontend Dev',
        company: 'Acme',
        status: ApplicationStatus.SENT,
      };

      // Mock JobSource "Manual" exists
      prisma.jobSource.findUnique.mockResolvedValue({
        id: 'source-1',
        name: 'Manual',
        url: 'https://manual.local',
      });

      // Mock JobOffer creation
      prisma.jobOffer.create.mockResolvedValue({
        id: 'offer-1',
        sourceId: 'source-1',
        externalId: 'manual-uuid',
        title: 'Frontend Dev',
        company: 'Acme',
        location: null,
        country: null,
        workModel: 'ON_SITE',
        description: 'Postulación ingresada manualmente por el usuario.',
        url: '',
        salaryMin: null,
        salaryMax: null,
        currency: null,
        skills: [],
        seniority: null,
        applicationsCount: null,
        perks: [],
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // @ts-ignore
        embedding: null,
      });

      // Mock Application creation
      const mockAppResult = {
        id: 'app-1',
        userId,
        offerId: 'offer-1',
        status: ApplicationStatus.SENT,
        notes: null,
        contactName: null,
        contactEmail: null,
        contactLinkedin: null,
        interviewDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // @ts-ignore
      prisma.application.create.mockResolvedValue(mockAppResult);

      const result = await service.createManual(userId, mockData);

      expect(prisma.jobSource.findUnique).toHaveBeenCalledWith({ where: { name: 'Manual' } });
      expect(prisma.jobOffer.create).toHaveBeenCalled();
      expect(prisma.application.create).toHaveBeenCalled();
      expect(result).toEqual(mockAppResult);
    });

    it('should throw BadRequestException on database error', async () => {
      const userId = 'user-123';
      const mockData = { title: 'Test' };

      prisma.jobSource.findUnique.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.createManual(userId, mockData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateNotes', () => {
    it('should update notes successfully', async () => {
      const appId = 'app-1';
      const userId = 'user-1';
      const data = { notes: 'New notes' };

      // @ts-ignore
      prisma.application.findFirst.mockResolvedValue({ id: appId, userId } as any);
      // @ts-ignore
      prisma.application.update.mockResolvedValue({ id: appId, notes: 'New notes' } as any);

      const result = await service.updateNotes(appId, userId, data);

      expect(prisma.application.findFirst).toHaveBeenCalledWith({ where: { id: appId, userId } });
      expect(prisma.application.update).toHaveBeenCalledWith({
        where: { id: appId },
        data: { notes: 'New notes' },
      });
      expect(result.notes).toBe('New notes');
    });

    it('should throw NotFoundException if application not found', async () => {
      prisma.application.findFirst.mockResolvedValue(null);

      await expect(service.updateNotes('app-1', 'user-1', { notes: 'test' }))
        .rejects.toThrow(NotFoundException);
    });
  });
});
