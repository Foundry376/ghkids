import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface UserNotificationSettings {
  announcements: boolean;
  forks: boolean;
  playSummaries: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  announcements: true,
  forks: true,
  playSummaries: true,
};

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: true })
  username: string;

  @Column({ type: "varchar", nullable: true })
  email: string;

  @Column({ type: "varchar", nullable: true })
  passwordHash: string;

  @Column({ type: "varchar", nullable: true })
  passwordSalt: string;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "NOW()" })
  updatedAt: Date;

  @Column({
    type: "jsonb",
    default: DEFAULT_NOTIFICATION_SETTINGS,
  })
  notificationSettings: UserNotificationSettings;

  serialize() {
    return {
      id: this.id,
      username: this.username,
    };
  }
}
