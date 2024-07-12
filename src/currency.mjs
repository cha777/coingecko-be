const keyMapping = {
    id: 'id',
    symbol: 'sym',
    name: 'lDes',
    image: 'image',
    current_price: 'ltp',
    market_cap: 'mktCap',
    total_volume: 'vol',
    price_change_24h: 'chgltp',
    price_change_percentage_24h: 'chgltpPct',
    price_change_percentage_1h_in_currency: 'pctChg',
    price_change_percentage_24h_in_currency: 'pctChg',
    price_change_percentage_7d_in_currency: 'wkPctChg',
};

class Currency {
    constructor(id, symbol) {
        this.id = id;
        this.sym = symbol;
    }

    setData(args) {
        for (const [key, value] of Object.entries(args)) {
            if (keyMapping[key]) {
                this[keyMapping[key]] = value;
            }
        }
    }
}

export default Currency;
