// *********************************************************************
//
// Process D&B Direct+ data blocks to the AnaCredit format
// JavaScript code file: processDnbDplDBsAnaCredit.js
//
// Copyright 2023 Hans de Rooij
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
import { RateLimiter } from 'limiter';

import { Header, dnbDplDBs } from './sharedDnbDplDBs.js';

const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });
const filePath = { root: '', dir: './out' };

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

// Convert the D&B Direct+ data blocks to an array of values
function anaCreditLayout(oDnbDplDBs, bHeader) {
    let arrValues = [];

    // Customer reference should be specified in the HTTP request
    //arrValues.push(bHeader ? oDnbDplDBs.map121.custRef.desc : oDnbDplDBs.map121.custRef.path);

    // Timestamp dating the D&B Direct+ REST request
    //arrValues.push(bHeader ? 'date requested' : oDnbDplDBs.transactionTimestamp());

    // DUNS requested
    //arrValues.push(bHeader ? oDnbDplDBs.map121.inqDuns.desc : oDnbDplDBs.map121.inqDuns.path);

    // DUNS delivered
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.duns.desc) : oDnbDplDBs.map121.duns.path);

    // LEI placeholder
    arrValues.push(bHeader ? new Header('LEI') : 'LEI placeholder');

    // List the entities external registration numbers & associated types
    arrValues = arrValues.concat( oDnbDplDBs.regNumsToArray(
        [
            oDnbDplDBs.const.regNum.component.numEcbFormat,
            oDnbDplDBs.const.regNum.component.ecbType
        ],
        2,
        bHeader && new Header(null)
    ));

    // Primary name
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.primaryName.desc) : oDnbDplDBs.map121.primaryName.path);

    // Address
    arrValues = arrValues.concat( oDnbDplDBs.addrToArray(
        oDnbDplDBs.org[oDnbDplDBs.const.addr.type.primary.attr],
        [
            oDnbDplDBs.const.addr.component.line1,
            oDnbDplDBs.const.addr.component.line2,
            oDnbDplDBs.const.addr.component.postalcode,
            oDnbDplDBs.const.addr.component.locality,
            oDnbDplDBs.const.addr.component.regionAbbr,
            oDnbDplDBs.const.addr.component.countryISO
        ],
        bHeader && new Header(null)
    ));

    // D&B legal form code
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.legalFormCode4.desc) : oDnbDplDBs.map121.legalFormCode4.path);

    // ECB legal form
    arrValues.push(bHeader ? new Header('ECB legal form') : oDnbDplDBs.getEcbLegalForm());

    // Institutional sector placeholder
    arrValues.push(bHeader ? new Header('Inst sector') : 'institutional sector');

    // Activity code NACE
    arrValues = arrValues.concat( oDnbDplDBs.indCodesToArray(
        oDnbDplDBs.const.indCodes.type.naceRev2,
        [ oDnbDplDBs.const.indCodes.component.code ],
        1,
        bHeader && new Header(null, `(${oDnbDplDBs.const.indCodes.type.naceRev2.descShort})`)
    ));

    // Operating status
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.opStatus.desc) : oDnbDplDBs.map121.opStatus.path);
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.opStatusDate.desc) : oDnbDplDBs.map121.opStatusDate.path);
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.opSubStatus.desc) : oDnbDplDBs.map121.opSubStatus.path);

    // Legal events
    arrValues.push(bHeader ? new Header('has bankruptcy') : oDnbDplDBs?.org?.legalEvents?.hasBankruptcy);
    arrValues.push(bHeader ? new Header('has bankruptcy date') : oDnbDplDBs?.org?.legalEvents?.bankruptcy?.mostRecentFilingDate);
    arrValues.push(bHeader ? new Header('has open bankruptcy') : oDnbDplDBs?.org?.legalEvents?.hasOpenBankruptcy);
    arrValues.push(bHeader ? new Header('has insolvency') : oDnbDplDBs?.org?.legalEvents?.hasInsolvency);
    arrValues.push(bHeader ? new Header('has insolvency date') : oDnbDplDBs?.org?.legalEvents?.insolvency?.mostRecentFilingDate);
    arrValues.push(bHeader ? new Header('has liquidation') : oDnbDplDBs?.org?.legalEvents?.hasLiquidation);
    arrValues.push(bHeader ? new Header('has susp of paym') : oDnbDplDBs?.org?.legalEvents?.hasSuspensionOfPayments);

    // SMB indicator
    arrValues.push(bHeader ? new Header(oDnbDplDBs.map121.SMB.desc) : oDnbDplDBs.map121.SMB.path);

    // Number of employees (scope individual/hq)
    arrValues = arrValues.concat( oDnbDplDBs.numEmplsToArray(
        [
            oDnbDplDBs.const.numEmpl.component.value,
            oDnbDplDBs.const.numEmpl.component.reliability,
            oDnbDplDBs.const.numEmpl.component.scope
        ],
        [
            oDnbDplDBs.const.numEmpl.scopeCodes.individual.code,
            oDnbDplDBs.const.numEmpl.scopeCodes.hq.code
        ],
        2,
        bHeader && new Header(null)
    ));

    // Number of employees (scope consolidated)
    arrValues = arrValues.concat( oDnbDplDBs.numEmplsToArray(
        [
            oDnbDplDBs.const.numEmpl.component.value,
            oDnbDplDBs.const.numEmpl.component.reliability,
            oDnbDplDBs.const.numEmpl.component.scope
        ],
        [
            oDnbDplDBs.const.numEmpl.scopeCodes.consolidated.code
        ],
        1,
        bHeader && new Header(null, 3, null)
    ));

    // Financial figures
    arrValues = arrValues.concat( oDnbDplDBs.latestFinsToArray( bHeader && new Header(null) ) );

    // Linkage DUNS
    const corpLinkLevels = oDnbDplDBs.corpLinkageLevels();

    // Is one level up the HQ or the parent
    arrValues.push(bHeader ? new Header('HQ or parent') : oDnbDplDBs.org?.corporateLinkage?.oneLevelUp);

    // Corporate linkage levels to list
    const linkLevels = [
        oDnbDplDBs.const.corpLinkage.level.oneLevelUp.idx,
        oDnbDplDBs.const.corpLinkage.level.gblUlt.idx
    ];

    // List the attributes for the specified linkage level
    linkLevels.forEach(linkLevel => {
        arrValues = arrValues.concat(
            oDnbDplDBs.corpLinkageLevelToArray(
                corpLinkLevels[linkLevel],
                [
                    oDnbDplDBs.const.corpLinkage.component.duns,
                    oDnbDplDBs.const.corpLinkage.component.name
                ],
                [
                    oDnbDplDBs.const.addr.component.line1,
                    oDnbDplDBs.const.addr.component.line2,
                    oDnbDplDBs.const.addr.component.postalcode,
                    oDnbDplDBs.const.addr.component.locality,
                    oDnbDplDBs.const.addr.component.regionAbbr,
                    oDnbDplDBs.const.addr.component.countryISO
                ],
                bHeader && new Header(null, null, corpLinkLevels[linkLevel].desc)
        ));
    })
    
    return arrValues;
}

// Read the D&B Direct+ data block files
fs.readdir(path.format(filePath))
    .then(arrFiles => {
        let listHeader = true;

        if(arrFiles.length === 0) {
            console.error(`No files available in ${filePath}`);
            return;
        }

        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => {
                        fs.readFile(path.format({ ...filePath, base: fn }))
                            .then(dbFile => {
                                const oDnbDplDBs = Object.create(dnbDplDBs);

                                try{
                                    oDnbDplDBs.init(dbFile);
                                }
                                catch(err) {
                                    console.error(err);
                                    console.error(oDnbDplDBs.err);
                                    return;
                                }

                                if(listHeader) {
                                    console.log(anaCreditLayout(oDnbDplDBs, listHeader).map(nullUndefToEmptyStr).join('|'));
                                    listHeader = false;
                                }
                                
                                console.log(anaCreditLayout(oDnbDplDBs).map(nullUndefToEmptyStr).join('|'));
                            })
                            .catch(err => console.error(err.message))
                    })
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message));
