import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLocalization,formatReasoningDuration,getReasoningTitle} from './localization.js';
test('default config',()=>assert.deepEqual(normalizeLocalization(),{reasoningLabel:'사유',showReasoningTime:true}));
test('duration labels',()=>{assert.equal(formatReasoningDuration(60),'1분');assert.equal(formatReasoningDuration(8),'8초');assert.equal(formatReasoningDuration(3660),'1시간 1분');});
test('title and time',()=>assert.equal(getReasoningTitle('Thought for 1분',60,normalizeLocalization()),'사유 · 1분'));
test('no time',()=>assert.equal(getReasoningTitle('Thought for 1분',60,normalizeLocalization({showReasoningTime:false})),'사유'));
test('during streaming',()=>assert.equal(getReasoningTitle('Thinking...',null,normalizeLocalization()),'사유 중...'));
test('unknown duration',()=>assert.equal(getReasoningTitle('Thought for some time','unknown',normalizeLocalization()),'사유'));
