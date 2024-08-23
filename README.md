# desfent
SF plugin to generate documentation and code analysis

## Installation

```
sf plugins install @entlog/desfent
```

## Usage

If you want to create the documentation of a single file use:
```
sf desfent do doc -f <cls_file> -o <new_doc_folder>
```

If you want to analyze a full directory (and generate related documentation) use.
```
sf desfent do doc -d <folder> -o <new_doc_folder>
```


## Troubleshoting

### Wrong node version
If your attempt to install the plugin results in something like this:
<pre>
warning @entlog/desfent > @salesforce/sf-plugins-core > @salesforce/core@7.5.0: this package has been deprecated, should have been released as v8.0.0
<b><i>error @oclif/core@4.0.18: The engine "node" is incompatible with this module. Expected version ">=18.0.0". Got "16.17.0"</i></b>
error Found incompatible module.
Installing plugin @entlog/desfent... failed
    Error: yarn add @entlog/desfent@latest --non-interactive --mutex=file:XXXXX/.local/share/sf/yarn.lock 
    --preferred-cache-folder=XXXXX/Library/Caches/sf/yarn --check-files exited with code 1
</pre>

Then you will have to upgrade your sf version. Check your version with:

```
% sf --version
```
This will show you the node version. At least a version 18 is required. In this example the version is v20:

```
% sf --version
@salesforce/cli/2.54.6 darwin-arm64 node-v20.16.0
```