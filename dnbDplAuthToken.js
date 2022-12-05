// *********************************************************************
//
// D&B Direct+ utilities, API authentication token
// JavaScript code file: dnbDplAuthToken.js
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

//The HTTP attributes for requesting a D&B Direct+ authentication token
const dnbDplAuthTokenHttpAttr = {
    ...dnbDplHttpAttr,
    path: '/v2/token',
    method: 'POST',
    body: JSON.stringify({ 'grant_type': 'client_credentials' })
};

//Base64 encode the D&B Direct+ credentials
function getBase64EncAuthHeader() {
    let ret = '';

    if(process.env.DNB_DPL_KEY && process.env.DNB_DPL_SECRET) {
        ret = Buffer.from(process.env.DNB_DPL_KEY + ':' + process.env.DNB_DPL_SECRET).toString('Base64')
    }
 
    return ret;
}

const base64AuthHeader = getBase64EncAuthHeader();

//Execute the D&B D+ token request if credentials are available
if(base64AuthHeader) {
    dnbDplAuthTokenHttpAttr.headers.Authorization = 'Basic ' + base64AuthHeader;

    new Https(dnbDplAuthTokenHttpAttr).execReq()
        .then(ret => {
            console.log(ret.buffBody.toString())
        })
        .catch(err => console.error(err));
}
else { //API key & secret not available in the environment
    let sErrMsg = 'Please set the Direct+ API credentials as environment variables\n';
    sErrMsg += 'When using a GitHub Codespace best paractice is to use Codespaces Secrets\n';
    sErrMsg += 'On your GitHub acct, go to Settings, Codespaces, Codespaces Secrets\n';
    sErrMsg += 'Otherwise just set the environment variables: DNB_DPL_TOKEN=abc1234...\n';

    console.error(sErrMsg)
}
