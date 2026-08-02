import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects the user to the Google OAuth consent screen.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google authentication.',
  })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the Google OAuth callback and redirects back to the frontend with a JWT token in the URL query.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with access_token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized if Google authentication fails.',
  })
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const { access_token } = await this.authService.validateOAuthLogin(
      req.user,
    );
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    // Devolvemos el token en la URL para que el frontend (Angular/React) pueda capturarlo
    // y guardarlo en su LocalStorage/Service sin problemas de configuración de cookies.
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }
}
