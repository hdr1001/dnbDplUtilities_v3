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
    }

    return regNum;
}

if(pgConn.database) {
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
                        const arrValues = [];

                        arrValues.push(row.duns);
                        arrValues.push(row.primname);
                        arrValues.push(row.isoctry);

                        const primaryRegNum = getPrimaryRegNum(row.regnums, row.isoctry);

                        if(primaryRegNum) {
                            arrValues.push(primaryRegNum);

                            const regNumLeiQryStr = {
                                ...leiQryStr,
                                'filter[entity.registeredAs]': primaryRegNum,
                                'filter[entity.legalAddress.country]': row.isoctry.toLowerCase()
                            };

                            const httpAttr = {
                                ...gleifLeiHttpAttr,
                                path: gleifLeiHttpAttr.path + '?' + new URLSearchParams(regNumLeiQryStr).toString()
                            };
    
                            new Https(httpAttr).execReq()
                                .then(ret => {
                                    let leiRec = null, sErr = '';
                                    
                                    try {
                                        leiRec = JSON.parse(ret.buffBody.toString());
                                    }
                                    catch(err) {
                                        sErr = 'Error parsing the Gleif LEI return';
                                    }

                                    if(leiRec && leiRec.data && leiRec.data.length) {
                                        const data0 = leiRec.data[0];

                                        arrValues.push(data0.id);
                                        arrValues.push(data0?.attributes?.entity?.legalName?.name);
                                        arrValues.push(data0?.attributes?.entity?.legalAddress?.country);
                                    }
                                    else {
                                        if(!sErr) {
                                            sErr = 'No LEI returned for submitted registration number'
                                        }

                                        arrValues.push(sErr);
                                    }

                                    console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
                                })
                                .catch(err => console.error(err));
                        }
                        else {
                            console.log('No valid registration number on D&B data')
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
    console.error('Please configure variable pgConn correctly')
}
