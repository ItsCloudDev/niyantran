import { applyNewsDedupToFeed, isNewsWireFeature } from './newsDedup.js';
import { applySensitiveShapingToFeed } from './sensitiveData.js';
import { applyRecordChecklistToFeed } from './recordChecklist.js';
import { applyGlobalBoardShapingToFeed } from './shapeGlobalBoards.js';
import { applyParliamentaryQuestionShapingToFeed } from './shapeQuestions.js';
import { applyCitationGuardToFeed } from './citationGuard.js';
import { applyOpenTenderFilterToFeed } from './shapeTenders.js';

/** Run client-side cleanup passes on a feature-feed body before paint. */
export function prepareDeskFeed(feed) {
  if (!feed) return feed;
  let next = feed;
  if (isNewsWireFeature(next.feature)) next = applyNewsDedupToFeed(next);
  next = applyCitationGuardToFeed(next);
  next = applyOpenTenderFilterToFeed(next);
  next = applySensitiveShapingToFeed(next);
  next = applyGlobalBoardShapingToFeed(next);
  next = applyParliamentaryQuestionShapingToFeed(next);
  next = applyRecordChecklistToFeed(next);
  return next;
}
