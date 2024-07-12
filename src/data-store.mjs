import Currency from './currency.mjs';

class DataStore {
    constructor(service) {
        this.service = service;
        this.store = {};
        this.top100 = [];
    }

    getCurrency(id, symbol) {
        let currency = this.store[id];

        if (!currency) {
            this.store[id] = currency = new Currency(id, symbol);
        }

        return currency;
    }

    updateTopCurrencies(currencyList) {
        this.top100 = currencyList;
    }
}

export default DataStore;
