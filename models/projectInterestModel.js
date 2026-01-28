import mongoose from "mongoose";

const { Schema } = mongoose;

const projectInterestSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    interested: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
  },
  { timestamps: true }
);

// �?nico registro por usuario interesado y post
projectInterestSchema.index({ post: 1, interested: 1 }, { unique: true });

const ProjectInterest = mongoose.model("ProjectInterest", projectInterestSchema);
export default ProjectInterest;
