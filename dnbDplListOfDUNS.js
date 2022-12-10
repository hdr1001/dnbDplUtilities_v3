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
import * as config from './dnbDplLodConfig.js';
import { Https } from './sharedLib.js';
import { readInpFile } from './sharedReadInpFile.js';

function exeDnbDplEnrichment(sDUNS) {
    function getBlockIDs() {
        return config.arrDBs
            .filter(elem => elem.level > 0)
            .map(oDB => `${oDB.db}_L${oDB.level}_v${oDB.version}`)
            .join(',')
    }

    function getFileBase(reqPath) {
        let ret = 'dnb_dpl_';

        if(reqPath === config.pathDnbDplDataBocks) {
            ret += config.arrDBs
                .filter(elem => elem.level > 0)
                .map(oDB => `${oDB.dbShort}_L${oDB.level}`)
                .join('_')
        }

        if(reqPath === config.pathDnbDplBeneficialOwner) {
            ret += config.productId
        }

        if(reqPath === config.pathDnbDplFullFamTree) {
            ret += 'full_fam_tree'
        }
        
        return `${ret}_${sDUNS}_${sDate}.json`
    }

    const sDate = new Date().toISOString().split('T')[0];

    config.reqDnbDplEnrichment
        .filter(elem => elem.doReq)
        .map(elem => {
            const httpAttr = { ...elem.httpAttr };

            let qryParams = null;

            //Configure the Data Blocks request
            if(httpAttr.path === config.pathDnbDplDataBocks) {
                httpAttr.path += `/${sDUNS}`; //Identify the resource

                //Construct the parameterized query string
                qryParams = { blockIDs: getBlockIDs(), orderReason: '6332' };

                if(config.dbsTradeUp) { qryParams.tradeUp = config.dbsTradeUp }
            }

            //Configure the beneficial owner request
            if(httpAttr.path === config.pathDnbDplBeneficialOwner) {
                //Construct the parameterized query string
                qryParams = {
                    duns: sDUNS,
                    productId: config.productId,
                    versionId: 'v1',
                    tradeUp: 'hq',
                    ownershipPercentage: config.ownershipPercentage
                };
            }

            //Configure the full family tree request
            if(httpAttr.path === config.pathDnbDplFullFamTree) {
                httpAttr.path += `/${sDUNS}`; //Identify the resource

                //Construct the parameterized query string
                qryParams = { 'page[size]': 1000 };

                if(config.fftBranchExcl) { qryParams.exclusionCriteria = config.fftBranchExcl }
            }

            if(qryParams) {
                httpAttr.path += '?' + new URLSearchParams(qryParams).toString();
            }

            if(config.resultToFile) {
                httpAttr.fileBase = getFileBase(elem.httpAttr.path)
            }

            return httpAttr;
        })
        .forEach(httpAttr => {
            new Https(httpAttr).execReq()
                .then(ret => {
                    if(config.resultToLogStatus) {
                        console.log(`DUNS: ${sDUNS} ➡️ status: ${ret.httpStatus}`)
                    }
                    if(config.resultToLogBody) {
                        console.log(`body: ${ret.buffBody.toString()}`)
                    }

                    if(config.resultToFile) {
                        if(ret.httpStatus !== 200) {
                            const pos = httpAttr.fileBase.indexOf('.json');

                            if(pos > - 1) {
                                httpAttr.fileBase = `${httpAttr.fileBase.slice(0, pos)}_${ret.httpStatus}${httpAttr.fileBase.slice(pos)}`
                            }
                        }

                        fs.writeFile(path.format({ ...config.outFile , base: httpAttr.fileBase }), ret.buffBody)
                            .then( /* console.log(`Wrote file ${httpAttr.fileBase} successfully`) */ )
                            .catch(err => console.error(err.message));
                    }
                })
                .catch(err => console.error(err));
        });
}

readInpFile(config.inpFile).forEach(exeDnbDplEnrichment);
