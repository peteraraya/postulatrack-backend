import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthLogin(profile: any) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.emails[0].value,
          googleId: profile.id,
          name: profile.displayName,
          avatarUrl: profile.photos[0]?.value,
        },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatarUrl,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
