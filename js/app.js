var app = angular.module('SECloud', ['ui.bootstrap', 'angular-md5']);

app.controller('SECloudCtrl', function($scope, $rootScope, $http, $filter, $modal, $interval, md5){
	var Utils = {
	    folderTemplate: '\
	        <div class="modal-body" style="padding-bottom: 0px;">\
	            <input type="text" class="form-control" ng-model="folderName">\
	            <span class="err-hint font-chinese" ng-bind="isFolderNameAvaliable()" ng-hide="isFolderNameAvaliable() == \'OK\'"></span>\
	        </div>\
	        <div class="modal-footer">\
	            <button class="btn btn-primary" ng-click="ok()" ng-disabled="isFolderNameAvaliable() != \'OK\'">确定</button>\
	            <button class="btn btn-warning" ng-click="cancel()">取消</button>\
	        </div>',
		typeIcon: {
		    'folder': 'fa fa-folder',
		    'zip': 'fa fa-file-archive-o',
		    'rar': 'fa fa-file-archive-o',
		    'gz': 'fa fa-file-archive-o',
		    'txt': 'fa fa-file-text-o',
		    'doc': 'fa fa-file-word-o',
		    'docx': 'fa fa-file-word-o',
		    'ppt': 'fa fa-file-powerpoint-o',
		    'pptx': 'fa fa-file-powerpoint-o',
		    'xls': 'fa fa-file-excel-o',
		    'xlsx': 'fa fa-file-excel-o',
		    'pdf': 'fa fa-file-pdf-o',
		    'mp3': 'fa fa-file-audio-o',
		    'jpg': 'fa fa-file-image-o',
		    'jpeg': 'fa fa-file-image-o',
		    'bmp': 'fa fa-file-image-o',
		    'png': 'fa fa-file-image-o',
		    'gif': 'fa fa-file-image-o',
		    'py': 'fa fa-file-code-o',
		    'js': 'fa fa-file-code-o',
		    'c': 'fa fa-file-code-o',
		    'cpp': 'fa fa-file-code-o',
		    'html': 'fa fa-file-code-o',
		    'unknown': 'fa fa-file-o'
		}
	};
	
	$scope.Config = {
		domain: 'secloud-demo.coding.io',
		secKey: '',
		isLogin: true
	};

	$rootScope.globalConfig = {
		uploadToken: '',
		downloadUrl: '',
		loading: false,
		uploadOK: false,
		uploadFaild: false,
		refresh: function(){
			$scope.FileList.refresh()
		},
		getPrefix: function(){
			return $scope.FilePath.getPrefix();
		}
	};

	$scope.NetUtils = {
		fetchFiles: function(callback){
			$scope.FileList.qnFiles = [];
			$http.jsonp('http://'+ $scope.Config.domain +'/list?callback=JSON_CALLBACK').
			success(function(data){
				$scope.FileList.qnFiles = data;
				callback();
			}).
			error(function(){
				$scope.Config.isLogin = false;
			});
		},
		login: function(){
			$http.post('http://'+ $scope.Config.domain + '/login', {passwd: md5.createHash($scope.Config.secKey)},
				{withCredentials: true}).success(function(data){
				$scope.NetUtils.fetchFiles(function(){
					$scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
				});
				$scope.Config.isLogin = true;
			}).error(function(){
				alert('认证失败');
			});
		},
		logout: function(){
			$http.post('http://'+ $scope.Config.domain + '/logout', {action: 'logout'}, {withCredentials: true}).
				success(function(data){
					$scope.Config.secKey = '';
					$scope.NetUtils.fetchFiles(function(){
						$scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
					});
				});
		},
		getUploadToken: function(){
			$http.jsonp('http://'+ $scope.Config.domain +'/uptoken?callback=JSON_CALLBACK').
			success(function(data){
				$rootScope.globalConfig.uploadToken = data.upToken;
			}).error(function(){
				console.log('Get uploadToken err!');
			});
		},
		getDownloadUrl: function(key){
			if(!key) return;
			key = $scope.FilePath.getPrefix() + key.name;
			$http.jsonp('http://'+ $scope.Config.domain +'/downloadurl?key=' + key + '&&callback=JSON_CALLBACK').
			success(function(data){
				$rootScope.globalConfig.downloadUrl = data.downloadUrl;
			}).error(function(){
				console.log('Get downloadUrl err!');
			});
		},
		deleteFile: function(key){
			if(!key) return;
			key = $scope.FilePath.getPrefix() + key.name;
			$http.post('http://'+ $scope.Config.domain + '/delete', {key: key}, {withCredentials: true}).
			success(function(data){
				console.log('Delete file: ' + key);
				$scope.FileList.refresh();
			}).error(function(){
				console.log('Delete file err!');
			});
		}
	};

	$scope.FilePath = {
		paths: [{name: '我的网盘'}],
		getPrefix: function(){
			var pathPrefix = '';
			for(var idx in $scope.FilePath.paths){
				if(idx > 0)
					pathPrefix += $scope.FilePath.paths[idx].name + '/';
			}
			return pathPrefix;
		},
		gotoFolder: function($index){
			var pops = $scope.FilePath.paths.length - $index - 1;
			while(pops--){
				$scope.FilePath.paths.pop();
			}
		},
		addFolder: function(){
			var modalInstance = $modal.open({
			  	template: Utils.folderTemplate,
			  	controller: 'FolerInputCtrl',
			  	size: 'sm',
			    resolve: {
			    	fileList: function () {
			    		return $scope.FileList.list;
			       	}
			    }
			});
			modalInstance.result.then(function (folderNameInput) {
			  	$scope.FilePath.paths.push({name: folderNameInput});
			});
		}
	};

	$scope.FileList = {
		qnFiles: [],
		list: [],
		getFileListWithPrefix: function(prefix){
			$scope.FileList.list = [];
			var dirSet = new Set();
			var files = [];
			for(var key in $scope.FileList.qnFiles){
				var curFile = $scope.FileList.qnFiles[key];
				var curFileName = curFile['name'];
				if(!curFileName.match(prefix))
					continue;
				var fileName = curFileName.substring(prefix.length);
				var subffix = fileName.split('/')[0];
				var fileInfo = {};
				if(subffix == fileName){
					fileInfo = JSON.parse(JSON.stringify(curFile));
					fileInfo['name'] = fileName;
					fileInfo['time'] = $filter('date')(fileInfo['time']/10000, 'yyyy-MM-dd HH:mm:ss');
					if(parseInt(fileInfo['size']/1000000000) != 0){
						fileInfo['size'] = parseInt(fileInfo['size']/1000000000) + 'MB';
					}else if(parseInt(fileInfo['size']/1000000) != 0){
						fileInfo['size'] = parseInt(fileInfo['size']/1000000) + 'MB';
					}else if(parseInt(fileInfo['size']/1000) != 0){
						fileInfo['size'] = parseInt(fileInfo['size']/1000) + 'KB';
					}else{
						fileInfo['size'] = fileInfo['size'] + 'B';
					}
					fileInfo['checked'] = false;
					files.push(fileInfo);
				}else if(!dirSet.has(subffix)){
					fileInfo = JSON.parse(JSON.stringify(curFile));
					fileInfo['name'] = subffix;
					fileInfo['size'] = '-';
					fileInfo['time'] = '-';
					fileInfo['checked'] = false;
					dirSet.add(subffix);
					files.push(fileInfo);
				}
			}
			$scope.FileList.list = files;
		},
		getFileIcon: function(fileInfo) {
			var subffix = fileInfo['name'].split(".").pop();
			if(fileInfo['size'] == '-')
				return Utils.typeIcon['folder'];
			else if(subffix in Utils.typeIcon && fileInfo['name'].length - subffix.length > 1)
				return Utils.typeIcon[subffix];
			return Utils.typeIcon['unknown'];
		},
		curChecked: null,
		updateCheck: function(file){
			if(file.size == '-'){
				$scope.FileList.curChecked = null;
				$scope.FilePath.paths.push({name: file.name});
				return;
			}
			if(file.checked){
				$scope.FileList.curChecked = null;
				file.checked = false;
			}else{
				for(var key in $scope.FileList.list)
					$scope.FileList.list[key].checked = false;
				$scope.FileList.curChecked = file;
				file.checked = true;
			}
		},
		refresh: function(){
			$scope.NetUtils.fetchFiles(function(){
				$scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
				$scope.FileList.curChecked = null;
			});
		}
	};

	$scope.Action = {
		counts: 0,
		reset: function(){
			$scope.Action.counts = 0;
		},
		check: function(){
			$interval(function(){
				if($scope.Config.isLogin){
					if($scope.Action.counts > 10*60/5){
						$scope.Action.counts = 0;
						$scope.NetUtils.logout();
					}else{
						$scope.Action.counts ++;
					}
				}
			}, 5000);
		}
	}

	$scope.$watch('FilePath.paths', function(){
		$scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
	}, true);

	(function init(){
		$scope.NetUtils.fetchFiles(function(){
			$scope.FileList.getFileListWithPrefix($scope.FilePath.getPrefix());
		});
		$scope.Action.check();
	})();
});

app.controller('FolerInputCtrl', function ($scope, $modalInstance, fileList) {
	$scope.folderName = '';
    $scope.isFolderNameAvaliable = function(){
	  	if($scope.folderName == '')
	  		return '请输入文件夹名';
	  	if($scope.folderName.match(/\//g))
	  		return "不能包含字符'/'"
	  	for(var key in fileList)
	  		if(fileList[key]['name'] == $scope.folderName && fileList[key]['size'] == '-')
	  			return '此文件夹已存在';
	  	return 'OK';
	};
	$scope.ok = function () {
    	$modalInstance.close($scope.folderName);
  	};
  	$scope.cancel = function () {
    	$modalInstance.dismiss('cancel');
  	};
});

app.directive('ngFileSelect', ['$rootScope', '$http', '$timeout', function ($rootScope, $http, $timeout) {
    return function (scope, ele, attr) {
        ele.bind('change', function (e) {
            var file = e.target.files[0];
            if (file == undefined) {
            	console.log('no file');
                return false;
            }
            $rootScope.globalConfig.loading = true;
            var form = new FormData();
            form.append('token', $rootScope.globalConfig.uploadToken);
            form.append('key', $rootScope.globalConfig.getPrefix() + file.name);
            form.append("file", file);
            $http.post('http://up.qiniu.com', form, {
                transformRequest: angular.identity,
            	headers: {'Content-Type': undefined}
            }).success(function (data) {
            	$rootScope.globalConfig.loading = false;
            	$rootScope.globalConfig.uploadOK = true;
            	$rootScope.globalConfig.refresh();
            	$timeout(function(){$rootScope.globalConfig.uploadOK = false;}, 3000);
            }).error(function(){
            	$rootScope.globalConfig.loading = false;
            	$rootScope.globalConfig.uploadFaild = true;
            	$timeout(function(){$rootScope.globalConfig.uploadFaild = false;}, 3000);
            });
        });
    };
}]);