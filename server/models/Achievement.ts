import { Document, Schema, model, models, type Model } from "mongoose";

export interface IAchievement extends Document {
  playerId: Schema.Types.ObjectId;
  achievementId: string;
  unlockedAt: Date;
}

// Lazy-initialise the model so that tests which never touch achievements
// don't crash when Mongoose has no active connection.
let _model: Model<IAchievement> | null = null;

function getModel(): Model<IAchievement> {
  if (_model) return _model;
  if (models.Achievement) {
    _model = models.Achievement as Model<IAchievement>;
    return _model;
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

  _model = model<IAchievement>("Achievement", AchievementSchema);
  return _model;
}

// Proxy that lazily initialises the real model on first use.
// Tests that never call Achievement methods won't trigger model compilation.
const Achievement = new Proxy({} as Model<IAchievement>, {
  get(_target, prop, receiver) {
    const realModel = getModel();
    const value = Reflect.get(realModel, prop, receiver);
    return typeof value === "function" ? value.bind(realModel) : value;
  },
});

export default Achievement;
