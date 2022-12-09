// *********************************************************************
//
// D&B Direct+ utilities, enrich a list of DUNS
// JavaScript code file: dnbDplListOfDUNS.js
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

import * as path from 'path';
import { promises as fs } from 'fs';
import { dnbDplHttpAttr, Https } from './sharedLib.js';
import { readInpFile } from './sharedReadInpFile.js';

//The HTTP attributes for requesting a D&B Direct+ enrichment
const pathDnbDplDataBocks = '/v1/data/duns';
const pathDnbDplBeneficialOwner = '/v1/beneficialowner';
const pathDnbDplFullFamTree = '/v1/familyTree';

//Configuration section: Data Blocks and/or beneficial owner and/or full family tree
const reqDnbDplEnrichment = [ //Set doReq parameter to true to request the enrichment 
    { doReq: true, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplDataBocks } },
    { doReq: true, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplBeneficialOwner } },
    { doReq: true, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplFullFamTree } }
];

//Configuration section: input and output files
const inpFile = { root: '', dir: 'in', base: 'DUNS.txt' };
const outFile = { root: '', dir: 'out' };

//Result persistence
const resultToLogStatus = true;
const resultToLogBody   = false;
const resultToFile      = true;

//Configuration section: Data Blocks, specify which blocks (@ which levels) to request
const arrDBs = [ //Set level to 0 ⬇️ to not include the block 
    {db: 'companyinfo',              level: 2, dbShort: 'ci', version: '1'},
    {db: 'principalscontacts',       level: 3, dbShort: 'pc', version: '2'},
    {db: 'hierarchyconnections',     level: 1, dbShort: 'hc', version: '1'},
    {db: 'financialstrengthinsight', level: 2, dbShort: 'fs', version: '1'},
    {db: 'paymentinsight',           level: 0, dbShort: 'pi', version: '1'},
    {db: 'eventfilings',             level: 0, dbShort: 'ef', version: '1'},
    {db: 'companyfinancials',        level: 0, dbShort: 'cf', version: '2'},
    {db: 'globalfinancials',         level: 0, dbShort: 'gf', version: '1'},
    {db: 'esginsight',               level: 0, dbShort: 'ei', version: '1'},
    {db: 'ownershipinsight',         level: 0, dbShort: 'oi', version: '1'},
    {db: 'globalbusinessranking',    level: 0, dbShort: 'br', version: '1'}
];

//Configuration section: Data Blocks, specify trade-up is needed, else false
const dbsTradeUp = 'hq'; //Possible values '', 'hq' or 'domhq'

//Configuration section: Beneficial owner
const productId = 'cmpbol'; //Possible values 'cmpbol' or 'cmpbos'
const ownershipPercentage = 2.5; //Possible values range from 0.00 to 100.00

//Configuration section: Full family tree, specify branch exclusion
const fftBranchExcl = ''; //Possible values '' or 'Branches'

function exeDnbDplEnrichment(sDUNS) {
    function getBlockIDs() {
        return arrDBs
            .filter(elem => elem.level > 0)
            .map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`)
            .join(',')
    }

    function getFileBase(reqPath) {
        let ret = 'dnb_dpl_';

        if(reqPath === pathDnbDplDataBocks) {
            ret += arrDBs
                .filter(elem => elem.level > 0)
                .map(oDB => `${oDB.dbShort}_L${oDB.level}`)
                .join('_')
        }

        if(reqPath === pathDnbDplBeneficialOwner) {
            ret += productId
        }

        if(reqPath === pathDnbDplFullFamTree) {
            ret += 'full_fam_tree'
        }
        
        return `${ret}_${sDUNS}_${sDate}.json`
    }

    const sDate = new Date().toISOString().split('T')[0];

    reqDnbDplEnrichment
        .filter(elem => elem.doReq)
        .map(elem => {
            const httpAttr = { ...elem.httpAttr };

            let qryParams = null;

            //Configure the Data Blocks request
            if(httpAttr.path === pathDnbDplDataBocks) {
                httpAttr.path += `/${sDUNS}`; //Identify the resource

                //Construct the parameterized query string
                qryParams = { blockIDs: getBlockIDs(), orderReason: '6332' };

                if(dbsTradeUp) { qryParams.tradeUp = dbsTradeUp }
            }

            //Configure the beneficial owner request
            if(httpAttr.path === pathDnbDplBeneficialOwner) {
                //Construct the parameterized query string
                qryParams = {
                    duns: sDUNS,
                    productId,
                    versionId: 'v1',
                    tradeUp: 'hq',
                    ownershipPercentage
                };
            }

            //Configure the full family tree request
            if(httpAttr.path === pathDnbDplFullFamTree) {
                httpAttr.path += `/${sDUNS}`; //Identify the resource

                //Construct the parameterized query string
                qryParams = { 'page[size]': 1000 };

                if(fftBranchExcl) { qryParams.exclusionCriteria = fftBranchExcl }
            }

            if(qryParams) {
                httpAttr.path += '?' + new URLSearchParams(qryParams).toString();
            }

            if(resultToFile) {
                httpAttr.fileBase = getFileBase(elem.httpAttr.path)
            }

            return httpAttr;
        })
        .forEach(httpAttr => {
            new Https(httpAttr).execReq()
                .then(ret => {
                    if(resultToLogStatus) {
                        console.log(`DUNS: ${sDUNS} ➡️ status: ${ret.httpStatus}`)
                    }
                    if(resultToLogBody) {
                        console.log(`body: ${ret.buffBody.toString()}`)
                    }

                    if(resultToFile) {
                        if(ret.httpStatus !== 200) {
                            const pos = httpAttr.fileBase.indexOf('.json');

                            if(pos > - 1) {
                                httpAttr.fileBase = `${httpAttr.fileBase.slice(0, pos)}_${ret.httpStatus}${httpAttr.fileBase.slice(pos)}`
                            }
                        }

                        fs.writeFile(path.format({ ...outFile , base: httpAttr.fileBase }), ret.buffBody)
                            .then( /* console.log(`Wrote file ${httpAttr.fileBase} successfully`) */ )
                            .catch(err => console.error(err.message));
                    }
                })
                .catch(err => console.error(err));
        });
}

readInpFile(inpFile).forEach(exeDnbDplEnrichment);
