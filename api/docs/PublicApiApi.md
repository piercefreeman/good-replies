# PublicApiApi

All URIs are relative to *http://localhost:5006*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getWhitelistedUsersApiWhitelistedUsersGet**](#getwhitelistedusersapiwhitelistedusersget) | **GET** /api/whitelisted-users | Get Whitelisted Users|
|[**processTweetsApiProcessTweetsPost**](#processtweetsapiprocesstweetspost) | **POST** /api/process-tweets | Process Tweets|
|[**verifyAuthApiAuthVerifyPost**](#verifyauthapiauthverifypost) | **POST** /api/auth/verify | Verify Auth|

# **getWhitelistedUsersApiWhitelistedUsersGet**
> WhitelistedUsersResponse getWhitelistedUsersApiWhitelistedUsersGet()

Get the list of users that are currently whitelisted (verified humans).

### Example

```typescript
import {
    PublicApiApi,
    Configuration
} from 'good-replies-api';

const configuration = new Configuration();
const apiInstance = new PublicApiApi(configuration);

const { status, data } = await apiInstance.getWhitelistedUsersApiWhitelistedUsersGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WhitelistedUsersResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **processTweetsApiProcessTweetsPost**
> ProcessTweetsResponse processTweetsApiProcessTweetsPost(processTweetsRequest)

Process a list of tweet URLs, extracting tweet IDs and validating the URLs.

### Example

```typescript
import {
    PublicApiApi,
    Configuration,
    ProcessTweetsRequest
} from 'good-replies-api';

const configuration = new Configuration();
const apiInstance = new PublicApiApi(configuration);

let processTweetsRequest: ProcessTweetsRequest; //

const { status, data } = await apiInstance.processTweetsApiProcessTweetsPost(
    processTweetsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **processTweetsRequest** | **ProcessTweetsRequest**|  | |


### Return type

**ProcessTweetsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **verifyAuthApiAuthVerifyPost**
> AuthResponse verifyAuthApiAuthVerifyPost(authRequest)

Verify user authentication with email and password, and generate a new API key.

### Example

```typescript
import {
    PublicApiApi,
    Configuration,
    AuthRequest
} from 'good-replies-api';

const configuration = new Configuration();
const apiInstance = new PublicApiApi(configuration);

let authRequest: AuthRequest; //

const { status, data } = await apiInstance.verifyAuthApiAuthVerifyPost(
    authRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authRequest** | **AuthRequest**|  | |


### Return type

**AuthResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

