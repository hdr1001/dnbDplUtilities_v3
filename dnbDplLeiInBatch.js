// *********************************************************************
//
// D&B Direct+ utilities, get Gleif LEI in batch
// JavaScript code file: dnbDplLeiInBatch.js
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

import { Https, Pool, pgConn } from './sharedLib.js';
import * as path from 'path';
import { promises as fs } from 'fs';

//Rate limit the number of requests to the Gleif API
import { RateLimiter } from 'limiter';
const gleifLimiter = new RateLimiter({ tokensPerInterval: 3, interval: 'second' });

//Pool of database connections
let pgPool;

//Generic Gleif Lei HTTP request attributes
const gleifLeiHttpHeaders = {
    'Accept': 'application/vnd.api+json'
};

const gleifLeiHttpAttr = {
    host: 'api.gleif.org',
    path: '/api/v1/lei-records',
    method: 'GET',
    headers: gleifLeiHttpHeaders
};

const leiQryStr = {
    'page[size]': 10,
    'page[number]': 1
};

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

function getPrimaryRegNum(regNums, ctry) {
    let regNum = '';

    const primaryRegNums = regNums.filter(oRegNum => oRegNum.isPreferredRegistrationNumber);

    if(primaryRegNums.length) {
        regNum = primaryRegNums[0].registrationNumber
    }
    else if(regNums.length) {
        regNum = regNums[0].registrationNumber
    }

    switch (ctry.toLowerCase()) {
        case 'ch':
            regNum = regNum.replace(/[^a-z0-9]/gi, ''); break;
        case 'it':
            if(regNum.slice(0, 2).toLowerCase() === 'it') { regNum = regNum.slice(2) }; break;
        case 'fr':
            const sirenRegnum = regNums.filter(oRegNum => oRegNum.typeDnBCode === 2078);

            if(sirenRegnum) { regNum = sirenRegnum[0].registrationNumber } ; break;
        case 'se':
            if(regNum.length === 10) {
                regNum = regNum.slice(0, 6) + '-' + regNum.slice(-4)
            }

            break;
    }

    return regNum;
}

function getLei(reqParams) {
    const regNumLeiQryStr = {
        ...leiQryStr,
        'filter[entity.registeredAs]': reqParams.primRegNum,
        'filter[entity.legalAddress.country]': reqParams.isoCtry.toLowerCase()
    };

    const httpAttr = {
        ...gleifLeiHttpAttr,
        path: gleifLeiHttpAttr.path + '?' + new URLSearchParams(regNumLeiQryStr).toString()
    };

    return new Https(httpAttr, gleifLimiter).execReq()
}

function writeToConsole(reqParams, respLei) {
    console.log([
        reqParams.duns,
        reqParams.primName,
        reqParams.isoCtry,
        reqParams.primRegNum
    ].concat(
        respLei.err ?
            [
                respLei.err
            ]
        :
            [
                respLei.lei,
                respLei.name,
                respLei.ctry,
            ]
    ).map(nullUndefToEmptyStr).join('|'));
}

function processLeiReturn(leiRet, reqParams) {
    let leiRec = null, respLei = {};
            
    try {
        leiRec = JSON.parse(leiRet.buffBody.toString());

        if(leiRec && leiRec.data && leiRec.data.length) {
            const data0 = leiRec.data[0];

            respLei.lei = data0.id;
            respLei.name = data0?.attributes?.entity?.legalName?.name;
            respLei.ctry = data0?.attributes?.entity?.legalAddress?.country;
        }
        else {
            respLei.err  = 'No LEI returned for submitted registration number'
        }
    }
    catch(err) {
        respLei.err = 'Error parsing the Gleif LEI record return'
    }

    writeToConsole(reqParams, respLei);
}

if(pgConn.database && 1 === 0) { //Remove "&& 1 === 0" to process duns from database
    console.log('Processing duns from database');

    pgPool = new Pool(pgConn);

    pgPool.connect()
        .then(clnt => {
            let sSql = 'SELECT ';
            sSql    += '   duns, ';
            sSql    += '   dbs->\'organization\'->\'primaryName\' AS primname, ';
            sSql    += '   dbs->\'organization\'->\'registrationNumbers\' AS regnums, ';
            sSql    += '   dbs->\'organization\'->\'countryISOAlpha2Code\' AS isoctry ';
            sSql    += 'FROM products_dnb';

            clnt.query(sSql)
                .then(res => {
                    clnt.release();

                    res.rows.forEach(row => {
                        const reqParams = {
                            duns: row.duns,
                            primName: row.primname,
                            isoCtry: row.isoctry,
                            primRegNum: getPrimaryRegNum(row.regnums, row.isoctry)
                        };

                        if(reqParams.primRegNum) {
                            getLei(reqParams)
                                .then(ret => processLeiReturn(ret, reqParams))
                                .catch(err => console.error(err));
                        }
                        else {
                            writeToConsole(reqParams, { err: 'No valid registration number available on D&B data' });
                        }
                   })
                })
                .catch(err => {
                    clnt.release();

                    console.error('query error', err.message);
                })
        })
        .catch(err => console.error(err.message));
}
else {
    console.error('Processing duns from json files containing data blocks')

    const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });

    const filePath = { root: '', dir: 'out' };
    
    fs.readdir(path.format(filePath))
        .then(arrFiles => 
            arrFiles
                .filter(fn => fn.endsWith('.json'))
                .forEach(fn => 
                    readFileLimiter.removeTokens(1)
                        .then(() => {
                            fs.readFile(path.format({ ...filePath, base: fn }))
                                .then(file => {
                                    let dbs;
    
                                    try {
                                        dbs = JSON.parse(file)
                                    }
                                    catch(err) {
                                        console.error(err.message);
                                        return;
                                    }
    
                                    const org = dbs.organization;

                                    const reqParams = {
                                        duns: org.duns,
                                        primName: org.primaryName,
                                        isoCtry: org.countryISOAlpha2Code,
                                        primRegNum: getPrimaryRegNum(org?.registrationNumbers, org.countryISOAlpha2Code)
                                    }

                                    if(reqParams.primRegNum) {
                                        getLei(reqParams)
                                            .then(ret => processLeiReturn(ret, reqParams))
                                            .catch(err => console.error(err));
                                    }
                                    else {
                                        writeToConsole(reqParams, { err: 'No valid registration number available on D&B data' });
                                    }
                                })
                                .catch(err => console.error(err.message))
                        })
                        .catch(err => console.error(err.message))
                )
        )
}
