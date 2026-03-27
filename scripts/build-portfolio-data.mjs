/**
 * Build unified portfolio-data.json
 * Merges existing tov2024 data (r001-r065, c001-c011) with new scraped data
 */
import fs from 'fs';
import path from 'path';

const EXISTING = JSON.parse(fs.readFileSync('portfolio-data-tov2024.json', 'utf-8'));
const NEW_ITEMS = JSON.parse(fs.readFileSync('scraped-new-items.json', 'utf-8'));
const DETAIL_DIR = path.join('assets', 'portfolio', 'detail');
const THUMB_DIR = path.join('assets', 'portfolio', 'thumbnails');

// Helper: list WebP files in a detail directory
function getDetailImages(id) {
  const dir = path.join(DETAIL_DIR, id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.webp'))
    .sort()
    .map(f => `assets/portfolio/detail/${id}/${f}`);
}

// Helper: parse title parts from bracket info
function parseTitleParts(info) {
  const parts = info.split('|').map(p => p.trim());
  return {
    region: parts[0] || '',
    type: parts[1] || '',
    area: parts[2] || '',
  };
}

// Build residential array
const residential = [];

// 1. Existing items r001-r065 (from tov2024)
for (const item of EXISTING.residential) {
  // Update detail images from actual files on disk
  const detailImages = getDetailImages(item.id);
  residential.push({
    ...item,
    detailImages: detailImages.length > 0 ? detailImages : item.detailImages,
    thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
  });
}

// 2. New items r066-r081
for (const item of NEW_ITEMS.filter(i => i.id.startsWith('r'))) {
  const detailImages = getDetailImages(item.id);
  const titleParts = parseTitleParts(item.displayTitle);

  residential.push({
    id: item.id,
    title: item.displayTitle,
    region: item.region || titleParts.region,
    type: item.type || titleParts.type,
    area: item.area || titleParts.area,
    duration: item.duration || '',
    cost: item.cost || '',
    thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
    detailImages,
  });
}

// Build commercial array
const commercial = [];

// 1. Existing items c001-c011 (from tov2024)
for (const item of EXISTING.commercial.slice(0, 11)) {
  const detailImages = getDetailImages(item.id);
  commercial.push({
    ...item,
    detailImages: detailImages.length > 0 ? detailImages : item.detailImages,
    thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
  });
}

// 2. Items c012-c025 (from scraped data)
// Map of page titles for old-format commercial items
const commercialTitles = {
  c012: { title: '고양 삼송 왁싱샵', region: '경기도 고양시 덕양구 삼송동', type: '상가_왁싱샵', area: '' },
  c013: { title: '동탄 카페', region: '경기도 화성시 동탄', type: '상가_카페', area: '' },
  c014: { title: '고양 삼송동 카페', region: '경기도 고양시 덕양구 삼송동', type: '상가_카페', area: '' },
  c015: { title: '경기도 화성 카페', region: '경기도 화성시', type: '상가_카페', area: '' },
  c016: { title: '하남 스타필드 타로샵', region: '경기도 하남시', type: '상가_타로샵', area: '' },
  c017: { title: '오산 실내포차 안도', region: '경기도 오산시', type: '상가_실내포차', area: '' },
  c018: { title: '배곧 피부샵', region: '경기도 시흥시 배곧', type: '상가_피부샵', area: '' },
  c019: { title: '우면동 피아노 교습소', region: '서울시 서초구 우면동', type: '상가_피아노교습소', area: '' },
  c020: { title: '피아노 학원', region: '', type: '상가_피아노학원', area: '' },
  c021: { title: '평택 여성전용 휘트니스', region: '경기도 평택시', type: '상가_휘트니스', area: '' },
};

for (const item of NEW_ITEMS.filter(i => i.id.startsWith('c'))) {
  const detailImages = getDetailImages(item.id);
  const override = commercialTitles[item.id];
  const titleParts = parseTitleParts(item.displayTitle);

  // Use page title for display
  const pageShortTitle = item.pageTitle
    ?.replace(/\s*:\s*토브디자인.*$/, '')
    ?.replace(/\s*::\s*에이치제이공감/, '')
    ?.replace(/\s*::\s*﻿에이치제이공감/, '')
    ?.replace(/^\[/, '')?.replace(/\]$/, '')
    ?.trim() || '';

  commercial.push({
    id: item.id,
    title: override ? override.title : (item.displayTitle !== '(구형)' ? item.displayTitle : pageShortTitle),
    region: override?.region || item.region || titleParts.region || '',
    type: override?.type || item.type || titleParts.type || '',
    area: override?.area || item.area || titleParts.area || '',
    duration: item.duration || '',
    cost: item.cost || '',
    thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
    detailImages,
  });
}

const portfolioData = { residential, commercial };

// Validate
console.log(`Residential: ${residential.length} items`);
console.log(`Commercial: ${commercial.length} items`);
console.log(`Total: ${residential.length + commercial.length} items`);

// Check for missing thumbnails
let missingThumbs = 0;
[...residential, ...commercial].forEach(item => {
  if (!fs.existsSync(item.thumbnail)) {
    console.log(`  ⚠️ Missing thumbnail: ${item.thumbnail}`);
    missingThumbs++;
  }
});
console.log(`Missing thumbnails: ${missingThumbs}`);

// Check items with 0 detail images
const noDetails = [...residential, ...commercial].filter(i => i.detailImages.length === 0);
if (noDetails.length) {
  console.log(`⚠️ Items with 0 detail images: ${noDetails.map(i => i.id).join(', ')}`);
}

// Write output
fs.writeFileSync('portfolio-data.json', JSON.stringify(portfolioData, null, 2), 'utf-8');
console.log(`\n✅ Saved portfolio-data.json`);
