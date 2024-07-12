import fetch from 'node-fetch';
import EventEmitter from 'events';

import DataStore from './data-store.mjs';
import WebSocketHandler from './web-socket-handler.mjs';

class Service {
    constructor() {
        const eventEmitter = new EventEmitter();

        this.dataStore = new DataStore(this);
        this.webSocketHandler = new WebSocketHandler(this, eventEmitter);
        this.eventEmitter = eventEmitter;
        this.isMetaReady = false;

        setInterval(() => {
            this.fetchCurrencyMetaData();
        }, 5000);
    }

    async fetchCurrencyMetaData() {
        try {
            const baseUrl = 'https://api.coingecko.com/api/v3/coins/markets';
            const fiatCurrency = 'usd';
            const order = 'market_cap_desc';
            const pageLimit = 100;
            const enableSparkline = false;
            const page = 1;
            const priceChangePerList = ['1h', '24h', '7d'];

            let urlParams = [
                ['vs_currency', fiatCurrency],
                ['order', order],
                ['per_page', pageLimit],
                ['page', page],
                ['sparkline', enableSparkline],
                ['price_change_percentage', priceChangePerList.join(',')],
            ].reduce((prev, cur) => {
                if (prev) {
                    return [prev, cur.join('=')].join('&');
                } else {
                    return cur.join('=');
                }
            }, '');

            const response = await fetch(`${baseUrl}?${urlParams}`);
            const body = await response.json();
            const currencyList = [];
            const currentState = this.dataStore.top100.slice();
            let tmpCurrency;
            let diffList = [];
            let diff;
            let currency;

            for (let i = 0; i < body.length; i++) {
                currency = this.dataStore.getCurrency(body[i].id, body[i].symbol);
                tmpCurrency = Object.assign({}, currency);

                currency.setData(body[i]);
                currencyList.push(currency);

                if (currentState[i]) {
                    diff = this._getDiff(tmpCurrency, currency);

                    if (Object.keys(diff).length !== 0) {
                        diff.id = currency.id;
                        diff.sym = currency.sym;

                        diffList.push(diff);
                    }
                } else {
                    diffList.push(currency);
                }
            }

            if (diffList.length) {
                console.log('Identified crypto data update');
                this.dataStore.updateTopCurrencies(currencyList);
                this.eventEmitter.emit('fetched', diffList);
            }
        } catch (e) {
            console.error('Error while processing currency data request: ' + e);
        }
    }

    _getDiff(prev, current) {
        const keys = Object.keys(current);
        const diff = {};

        for (let key of keys) {
            if (current[key] !== prev[key]) {
                diff[key] = current[key];
            }
        }

        return diff;
    }
}

const service = new Service();
export default service;
