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

import { Https } from './sharedLib.js';

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
