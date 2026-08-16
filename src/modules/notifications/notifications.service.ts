import { Injectable, Logger } from '@nestjs/common';
import * as Pusher from 'pusher';

@Injectable()
export class NotificationsService {
  private pusher?: any;
  private readonly logger = new Logger(NotificationsService.name);

  constructor() {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (appId && key && secret && cluster) {
      const PusherClient = require('pusher');
      this.pusher = new PusherClient({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
      this.logger.log('Pusher client initialized successfully');
    } else {
      this.logger.warn(
        'Pusher credentials not found in environment. Real-time notifications will be disabled.',
      );
    }
  }

  /**
   * Dispatches an event to a specific channel
   * @param channel The channel name (e.g., 'private-user-123')
   * @param event The event name (e.g., 'job-alert')
   * @param data The payload to send
   */
  async trigger(channel: string, event: string, data: any) {
    if (!this.pusher) {
      this.logger.warn(
        `Cannot trigger event ${event}: Pusher is not configured`,
      );
      return;
    }

    try {
      await this.pusher.trigger(channel, event, data);
      this.logger.debug(`Event ${event} sent to channel ${channel}`);
    } catch (error) {
      this.logger.error(`Error triggering Pusher event ${event}:`, error);
    }
  }

  /**
   * Helper method to send a notification to a specific user
   */
  async notifyUser(userId: string, eventName: string, payload: any) {
    // We use a user-specific channel
    const channelName = `user-${userId}`;
    await this.trigger(channelName, eventName, payload);
  }
}
