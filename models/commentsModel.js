// models/Comment.js

import mongoose from "mongoose";
import {
  validateContentOnSave,
  validateContentOnUpdate
} from "../Middleware/profanityFilter.js";

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  flagged: {
    type: Boolean,
    default: false
  },
  likedBy: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}],

}, {
  timestamps: true
});

commentSchema.pre('save', validateContentOnSave);
commentSchema.pre('findOneAndUpdate', validateContentOnUpdate);
commentSchema.pre('updateOne', validateContentOnUpdate);

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
