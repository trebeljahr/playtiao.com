import { Document, Schema, model, models } from "mongoose";

export interface IAchievement extends Document {
  playerId: Schema.Types.ObjectId;
  achievementId: string;
  unlockedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "GameAccount",
      required: true,
    },
    achievementId: {
      type: String,
      required: true,
      trim: true,
    },
    unlockedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
  },
);

AchievementSchema.index({ playerId: 1, achievementId: 1 }, { unique: true });
AchievementSchema.index({ playerId: 1 });

const Achievement = models.Achievement || model<IAchievement>("Achievement", AchievementSchema);

export default Achievement;
