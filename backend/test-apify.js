/**
 * Script de test pour vérifier l'intégration Apify
 * Usage: node test-apify.js
 */

import 'dotenv/config';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

console.log('===========================================');
console.log('TEST APIFY INTEGRATION');
console.log('===========================================\n');

// Vérifier le token
if (!APIFY_API_TOKEN) {
  console.error('❌ APIFY_API_TOKEN non configuré dans .env');
  process.exit(1);
}

console.log('✅ Token Apify trouvé:', APIFY_API_TOKEN.substring(0, 20) + '...\n');

// Test 1: Vérifier le compte Apify
async function testApifyAccount() {
  console.log('📡 Test 1: Vérification du compte Apify...');

  try {
    const response = await fetch(
      `https://api.apify.com/v2/users/me?token=${APIFY_API_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Compte vérifié!');
    console.log(`   - Username: ${data.data.username}`);
    console.log(`   - Email: ${data.data.email}`);
    console.log(`   - Plan: ${data.data.plan?.name || 'Free'}`);
    console.log(`   - Crédits restants: $${(data.data.proxy?.groups?.[0]?.availableUsd || 0).toFixed(2)}\n`);
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

// Test 2: Lister les actors disponibles
async function testActors() {
  console.log('📡 Test 2: Vérification des actors...');

  const actors = [
    { name: 'Instagram Scraper', id: 'apify/instagram-scraper' },
    { name: 'TikTok Scraper', id: 'clockworks/tiktok-scraper' },
  ];

  for (const actor of actors) {
    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actor.id}?token=${APIFY_API_TOKEN}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${actor.name} disponible`);
        console.log(`   - Version: ${data.data.versions?.[0]?.versionNumber || 'N/A'}`);
      } else {
        console.log(`⚠️  ${actor.name} - Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${actor.name} - Erreur: ${error.message}`);
    }
  }
  console.log('');
}

// Test 3: Faire un vrai scrape Instagram (petit test)
async function testInstagramScrape() {
  console.log('📡 Test 3: Scrape Instagram (compte public @instagram)...');
  console.log('   ⏳ Cela peut prendre 20-30 secondes...\n');

  try {
    // Lancer le scrape
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: ['https://www.instagram.com/instagram/'],
          resultsLimit: 3,
          resultsType: 'posts',
        }),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Run failed: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`   Run ID: ${runId}`);

    // Attendre le résultat
    let status = 'RUNNING';
    let attempts = 0;

    while (status === 'RUNNING' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      process.stdout.write('.');

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
    }

    console.log('\n');

    if (status === 'SUCCEEDED') {
      // Récupérer les résultats
      const resultsResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
      );
      const results = await resultsResponse.json();

      console.log(`✅ Scrape réussi! ${results.length} post(s) récupéré(s)`);

      if (results.length > 0) {
        const post = results[0];
        console.log('\n   Premier post:');
        console.log(`   - ID: ${post.id || post.shortCode}`);
        console.log(`   - Caption: ${(post.caption || '').substring(0, 80)}...`);
        console.log(`   - Likes: ${post.likesCount || 0}`);
        console.log(`   - Comments: ${post.commentsCount || 0}`);
      }
      return true;
    } else {
      console.log(`⚠️  Statut final: ${status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  }
}

// Exécuter les tests
async function runTests() {
  const accountOk = await testApifyAccount();
  if (!accountOk) {
    console.log('\n❌ Arrêt des tests - problème de compte');
    return;
  }

  await testActors();

  const scrapeOk = await testInstagramScrape();

  console.log('\n===========================================');
  console.log('RÉSUMÉ');
  console.log('===========================================');
  console.log(`Compte Apify: ${accountOk ? '✅' : '❌'}`);
  console.log(`Scrape Instagram: ${scrapeOk ? '✅' : '❌'}`);
  console.log('===========================================\n');

  if (accountOk && scrapeOk) {
    console.log('🎉 Tout fonctionne! Tu peux utiliser Apify pour scraper Instagram/TikTok.');
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifie la configuration.');
  }
}

runTests();
