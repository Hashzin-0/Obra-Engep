import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pathForLibrarySection,
  pathForModule,
  pathForTab,
  resolveAppRoute,
} from './appRoutes';

test('root route resolves to home', () => {
  assert.deepEqual(resolveAppRoute('/'), {
    tab: 'inicio', module: null, librarySubTab: 'nrs',
  });
});

test('top-level tabs use clean root paths', () => {
  assert.equal(pathForTab('favoritos'), '/fav');
  assert.equal(pathForTab('biblioteca'), '/biblioteca');
  assert.equal(pathForTab('mais'), '/mais');
  assert.equal(pathForTab('inicio'), '/');
  assert.equal(resolveAppRoute('/fav').tab, 'favoritos');
});

test('library section and item deep links resolve', () => {
  assert.equal(pathForLibrarySection('nrs', 'nr-10'), '/biblioteca/nrs/nr-10');
  assert.deepEqual(resolveAppRoute('/biblioteca/abnt/nbr-5410'), {
    tab: 'biblioteca', module: null, librarySubTab: 'abnt', itemId: 'nbr-5410',
  });
  assert.equal(resolveAppRoute('/biblioteca/manuais').librarySubTab, 'manuais');
});

test('modules use root-level paths and preserve item identifiers', () => {
  assert.equal(pathForModule('calculadoras', 'lei_ohm'), '/calculadoras/lei_ohm');
  assert.equal(pathForModule('projetos'), '/projetos');
  assert.equal(pathForModule('ia', 'ventilacao'), '/ia/ventilacao');
  assert.equal(resolveAppRoute('/calculadoras/lei_ohm').itemId, 'lei_ohm');
  assert.equal(resolveAppRoute('/ia/ventilacao').itemId, 'ventilacao');
});
