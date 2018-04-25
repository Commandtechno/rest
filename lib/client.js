'use strict';

const UrlUtils = require('url');

const Request = require('./request');
const Route = require('./route');

const Utils = require('./utils');
const Constants = Utils.Constants;

const defaults = {
	settings: {
		timeout: 20000,
		maxRetries: 5,
		retryTime: 2000
	},
	headers: {
		'user-agent': `detritus-rest/${Constants.Package.VERSION} (${Constants.Package.URL})`
	}
};

class Client
{
	constructor(options)
	{
		options = Object.assign({}, defaults, options);

		this.settings = Object.assign({}, defaults.settings);
		if (options.settings) {
			Object.keys(defaults.settings).forEach((key) => {
				if (options.settings[key] === undefined) {return;}
				this.settings[key] = options.settings[key];
			});
		}

		this.headers = Object.assign({}, defaults.headers, options.headers);

		this.baseUrl = null;
		if (options.url) {
			this.baseUrl = new UrlUtils.URL(options.url);
		}
	}

	request(options)
	{
		return new Promise((resolve, reject) => {
			options = Object.assign({}, options);

			if (options.route || options.path) {
				if (typeof(options.route) !== 'object') {options.route = {};}
				if (!(options.route instanceof Route)) {
					options.route = new Route(
						options.route.method || options.method,
						options.route.path || options.path,
						options.route.params || {}
					);
				}
				options.method = options.route.method;
			}

			if (!options.method) {return reject(new Error('Method is required in a request!'));}
			if (!options.url && !options.route) {return reject(new Error('URL or Path has to be specified in a request!'));}

			if (options.route) {
				if (!this.baseUrl && !options.url) {return reject(new Error('Route or Path cannot be used without a url specified and no base in the client!'));}
				options.url = new UrlUtils.URL(this.baseUrl || options.url);
				options.url.pathname = options.route.urlPath;
			} else {
				options.url = new UrlUtils.URL(options.url);
			}
			if (options.query) {
				for (let key in options.query) {
					options.url.searchParams.set(key, options.query[key]);
				}
			}
			if (options.method === 'GET' && options.body) {
				if (typeof(options.body) === 'object') {
					for (let key in options.body) {
						options.url.searchParams.set(key, options.body[key]);
					}
				}
				options.body = null;
			}

			const headers = Object.assign({}, this.headers);
			if (options.headers) {
				Object.keys(options.headers || {}).forEach((key) => {
					headers[key.toLowerCase()] = options.headers[key];
				});
			}
			options.headers = headers;

			options.method = options.method.toUpperCase(); //for http2 lol

			resolve(options);
		}).then((options) => {
			const request = new Request(this, options);
			return request.send();
		});
	}
}

module.exports = Client;