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
    'page[number]': 1,
    'filter[entity.legalAddress.country]': 'nl',
    'filter[entity.registeredAs]': '33011433'
};

const httpAttr = { ...gleifLeiHttpAttr, path: gleifLeiHttpAttr.path + '?' + new URLSearchParams(leiQryStr).toString() };

new Https(httpAttr).execReq()
    .then(ret => {
        console.log(JSON.stringify(JSON.parse(ret.buffBody.toString()), null, 3))
    })
    .catch(err => console.error(err));

if(pgConn.database) {
    pgPool = new Pool(pgConn);

    pgPool.connect()
        .then(clnt => {
            let sSql = 'SELECT ';
            sSql    += '   duns, ';
            sSql    += '   dbs->\'organization\'->\'registrationNumbers\' AS regnums, ';
            sSql    += '   dbs->\'organization\'->\'countryISOAlpha2Code\' AS isoctry ';
            sSql    += 'FROM products_dnb';

            clnt.query(sSql)
                .then(res => {
                    clnt.release();

                    res.rows.forEach(row => console.log(`${row.duns}, ${row.regnums.length}, ${row.isoctry}`));
                })
                .catch(err => {
                    clnt.release();

                    console.error('query error', err.message);
                })
            })
        .catch(err => console.error(err.message));
}
else {
    console.error('Please configure variable pgConn correctly');
}
