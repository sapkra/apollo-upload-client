'use strict';

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _require = require('@apollo/client'),
    ApolloLink = _require.ApolloLink,
    Observable = _require.Observable,
    selectURI = _require.selectURI,
    selectHttpOptionsAndBody = _require.selectHttpOptionsAndBody,
    fallbackHttpConfig = _require.fallbackHttpConfig,
    serializeFetchParameter = _require.serializeFetchParameter,
    createSignalIfSupported = _require.createSignalIfSupported,
    parseAndCheckHttpResponse = _require.parseAndCheckHttpResponse,
    fromError = _require.fromError;

var _require2 = require('@apollo/client/link/http/rewriteURIForGET'),
    rewriteURIForGET = _require2.rewriteURIForGET;

var _require3 = require('extract-files'),
    extractFiles = _require3.extractFiles,
    isExtractableFile = _require3.isExtractableFile,
    ReactNativeFile = _require3.ReactNativeFile;

exports.ReactNativeFile = ReactNativeFile;
exports.isExtractableFile = isExtractableFile;

function formDataAppendFile(formData, fieldName, file) {
  formData.append(fieldName, file, file.name);
}

exports.formDataAppendFile = formDataAppendFile;

exports.createUploadLink = function (_temp) {
  var _ref = _temp === void 0 ? {} : _temp,
      _ref$uri = _ref.uri,
      fetchUri = _ref$uri === void 0 ? '/graphql' : _ref$uri,
      _ref$isExtractableFil = _ref.isExtractableFile,
      customIsExtractableFile = _ref$isExtractableFil === void 0 ? isExtractableFile : _ref$isExtractableFil,
      CustomFormData = _ref.FormData,
      _ref$formDataAppendFi = _ref.formDataAppendFile,
      customFormDataAppendFile = _ref$formDataAppendFi === void 0 ? formDataAppendFile : _ref$formDataAppendFi,
      customFetch = _ref.fetch,
      fetchOptions = _ref.fetchOptions,
      credentials = _ref.credentials,
      headers = _ref.headers,
      includeExtensions = _ref.includeExtensions,
      useGETForQueries = _ref.useGETForQueries;

  var linkConfig = {
    http: {
      includeExtensions: includeExtensions
    },
    options: fetchOptions,
    credentials: credentials,
    headers: headers
  };
  return new ApolloLink(function (operation) {
    var uri = selectURI(operation, fetchUri);
    var context = operation.getContext();
    var _context$clientAwaren = context.clientAwareness;
    _context$clientAwaren = _context$clientAwaren === void 0 ? {} : _context$clientAwaren;
    var name = _context$clientAwaren.name,
        version = _context$clientAwaren.version,
        headers = context.headers;
    var contextConfig = {
      http: context.http,
      options: context.fetchOptions,
      credentials: context.credentials,
      headers: (0, _extends2.default)({}, name && {
        'apollographql-client-name': name
      }, version && {
        'apollographql-client-version': version
      }, headers)
    };

    var _selectHttpOptionsAnd = selectHttpOptionsAndBody(operation, fallbackHttpConfig, linkConfig, contextConfig),
        options = _selectHttpOptionsAnd.options,
        body = _selectHttpOptionsAnd.body;

    var _extractFiles = extractFiles(body, '', customIsExtractableFile),
        clone = _extractFiles.clone,
        files = _extractFiles.files;

    var payload = serializeFetchParameter(clone, 'Payload');

    if (files.size) {
      delete options.headers['content-type'];
      var RuntimeFormData = CustomFormData || FormData;
      var form = new RuntimeFormData();
      form.append('operations', payload);
      var map = {};
      var i = 0;
      files.forEach(function (paths) {
        map[++i] = paths;
      });
      form.append('map', JSON.stringify(map));
      i = 0;
      files.forEach(function (paths, file) {
        customFormDataAppendFile(form, ++i, file);
      });
      options.body = form;
    } else {
      if (useGETForQueries && !operation.query.definitions.some(function (definition) {
        return definition.kind === 'OperationDefinition' && definition.operation === 'mutation';
      })) options.method = 'GET';

      if (options.method === 'GET') {
        var _rewriteURIForGET = rewriteURIForGET(uri, body),
            newURI = _rewriteURIForGET.newURI,
            parseError = _rewriteURIForGET.parseError;

        if (parseError) return fromError(parseError);
        uri = newURI;
      } else options.body = payload;
    }

    return new Observable(function (observer) {
      var abortController;

      if (!options.signal) {
        var _createSignalIfSuppor = createSignalIfSupported(),
            controller = _createSignalIfSuppor.controller;

        if (controller) {
          abortController = controller;
          options.signal = abortController.signal;
        }
      }

      var runtimeFetch = customFetch || fetch;
      runtimeFetch(uri, options).then(function (response) {
        operation.setContext({
          response: response
        });
        return response;
      }).then(parseAndCheckHttpResponse(operation)).then(function (result) {
        observer.next(result);
        observer.complete();
      }).catch(function (error) {
        if (error.name === 'AbortError') return;
        if (error.result && error.result.errors && error.result.data) observer.next(error.result);
        observer.error(error);
      });
      return function () {
        if (abortController) abortController.abort();
      };
    });
  });
};