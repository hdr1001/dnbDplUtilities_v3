// *********************************************************************
//
// D&B Direct+ utilities, configuration settings for enrich a LoD
// JavaScript code file: dnbDplLodConfig.js
//
// Copyright 2022 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

import { dnbDplHttpAttr } from './sharedLib.js';

//The HTTP attributes for requesting a D&B Direct+ enrichment
const pathDnbDplDataBocks = '/v1/data/duns';
const pathDnbDplBeneficialOwner = '/v1/beneficialowner';
const pathDnbDplFullFamTree = '/v1/familyTree';

//Data Blocks and/or beneficial owner and/or full family tree
const reqDnbDplEnrichment = [ //Set doReq parameter to true to request the enrichment 
    { doReq: true, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplDataBocks } },
    { doReq: false, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplBeneficialOwner } },
    { doReq: false, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplFullFamTree } }
];

//Input and output files
const inpFile = { root: '', dir: 'in', base: 'DUNS.txt' };
const outFile = { root: '', dir: 'out' };

//Result persistence
const resultToLogStatus = true;
const resultToLogBody   = false;
const resultToFile      = true;

//Data Blocks, specify which blocks (@ which levels) to request
const arrDBs = [ //Set level to 0 ⬇️ to not include the block 
    {db: 'companyinfo',               level: 2, dbShort: 'ci', version: '1'},
    {db: 'principalscontacts',        level: 2, dbShort: 'pc', version: '2'},
    {db: 'hierarchyconnections',      level: 1, dbShort: 'hc', version: '1'},
    {db: 'financialstrengthinsight',  level: 0, dbShort: 'fs', version: '1'},
    {db: 'paymentinsight',            level: 0, dbShort: 'pi', version: '1'},
    {db: 'eventfilings',              level: 0, dbShort: 'ef', version: '1'},
    {db: 'companyfinancials',         level: 0, dbShort: 'cf', version: '2'},
    {db: 'globalfinancials',          level: 0, dbShort: 'gf', version: '1'},
    {db: 'esginsight',                level: 0, dbShort: 'ei', version: '1'},
    {db: 'ownershipinsight',          level: 0, dbShort: 'oi', version: '1'},
    {db: 'globalbusinessranking',     level: 0, dbShort: 'br', version: '1'},
    {db: 'businessactivityinsight',   level: 0, dbShort: 'ba', version: '1'},
    {db: 'diversityinsight',          level: 0, dbShort: 'di', version: '1'},
    {db: 'dtri',                      level: 0, dbShort: 'dt', version: '1'},
    {db: 'externaldisruptioninsight', level: 0, dbShort: 'ed', version: '1'},
    {db: 'inquiryinsight',            level: 0, dbShort: 'ii', version: '1'},
    {db: 'salesmarketinginsight',     level: 0, dbShort: 'sm', version: '2'},
    {db: 'shippinginsight',           level: 0, dbShort: 'si', version: '1'}
];

//Data Blocks, specify trade-up is needed, else false
const dbsTradeUp = ''; //Possible values '', 'hq' or 'domhq'

//Beneficial owner
const productId = 'cmpbol'; //Possible values 'cmpbol' or 'cmpbos'
const ownershipPercentage = 2.5; //Possible values range from 0.00 to 100.00

//Full family tree, specify branch exclusion
const fftBranchExcl = ''; //Possible values '' or 'Branches'

export {
    pathDnbDplDataBocks,
    pathDnbDplBeneficialOwner,
    pathDnbDplFullFamTree,

    reqDnbDplEnrichment,

    inpFile,
    outFile,

    resultToLogStatus,
    resultToLogBody,
    resultToFile,

    arrDBs,

    dbsTradeUp,

    productId,
    ownershipPercentage,

    fftBranchExcl
};
