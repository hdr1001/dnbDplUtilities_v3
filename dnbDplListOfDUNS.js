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

import { dnbDplHttpAttr, Https } from './sharedLib.js';

//Read the environment variables from the .env file
import * as dotenv from 'dotenv';
dotenv.config();

//The HTTP attributes for requesting a D&B Direct+ enrichment
const pathDnbDplDataBocks = '/v1/data/duns';
const pathDnbDplBeneficialOwner = '/v1/beneficialowner';
const pathDnbDplFullFamTree = '/v1/familyTree';

//Configuration section: Data Blocks and/or beneficial owner and/or full family tree
const reqDnbDplEnrichment = [
    { doReq: true, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplDataBocks } },
    { doReq: false, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplBeneficialOwner } },
    { doReq: false, httpAttr: { ...dnbDplHttpAttr, path: pathDnbDplFullFamTree } }
];

//Configuration section: Specify which D&B Direct+ Data Blocks to request
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

//Configuration section: Specify true if a trade-up is needed, else false
const tradeUp = false;

function exeDnbDplEnrichment(sDUNS) {
    function getBlockIDs() {
        return arrDBs
            .filter(elem => elem.level > 0)
            .map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`)
            .join(',')
    }

    reqDnbDplEnrichment
        .filter(elem => elem.doReq)
        .map(elem => {
            const httpAttr = { ...elem.httpAttr };

            //Add an authorization header to each request
            httpAttr.headers.Authorization = 'Bearer ' + process.env.DNB_DPL_TOKEN;

            //Configure the Data Blocks request
            if(httpAttr.path === pathDnbDplDataBocks) {
                httpAttr.path += `/${sDUNS}`; //Identify the resource

                //Construct the parameterized query string
                const qryParams = { blockIDs: getBlockIDs(), orderReason: '6332' };

                if(tradeUp) { qryParams.tradeUp = 'hq' }

                httpAttr.path += '?' + new URLSearchParams(qryParams).toString()
            }

            return httpAttr;
        })
        .forEach(httpAttr => {
            new Https(httpAttr).execReq()
                .then(ret => {
                    console.log(`Status: ${ret.httpStatus}, body: ${ret.buffBody.toString()}`)
                })
                .catch(err => console.error(err));
        });
}

exeDnbDplEnrichment('407809623');
